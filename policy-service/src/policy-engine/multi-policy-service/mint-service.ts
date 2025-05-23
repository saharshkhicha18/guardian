import { AnyBlockType } from '../policy-engine.interface.js';
import { ContractParamType, ExternalMessageEvents, GenerateUUIDv4, ISignOptions, NotificationAction, WorkerTaskType } from '@guardian/interfaces';
import { DatabaseServer, ExternalEventChannel, KeyType, MessageAction, MessageServer, MultiPolicy, MultiPolicyTransaction, NotificationHelper, PinoLogger, SynchronizationMessage, Token, TopicConfig, Users, VcDocumentDefinition as VcDocument, Wallet, Workers } from '@guardian/common';
import { AccountId, PrivateKey, TokenId } from '@hashgraph/sdk';
import { PolicyUtils } from '../helpers/utils.js';
import { IHederaCredentials, PolicyUser } from '../policy-user.js';
import { FilterObject } from '@mikro-orm/core';

/**
 * Token Config
 */
interface TokenConfig {
    /**
     * Token name
     */
    tokenName: string
    /**
     * Treasury Account Id
     */
    treasuryId: any;
    /**
     * Token ID
     */
    tokenId: any;
    /**
     * Supply Key
     */
    supplyKey: string;
    /**
     * Treasury Account Key
     */
    treasuryKey: string;
}

/**
 * Mint Service
 */
export class MintService {
    /**
     * Size of mint NFT batch
     */
    public static readonly BATCH_NFT_MINT_SIZE =
        Math.floor(Math.abs(+process.env.BATCH_NFT_MINT_SIZE)) || 10;

    /**
     * Wallet service
     */
    private static readonly wallet = new Wallet();
    /**
     * Logger service
     */
    private static readonly logger = new PinoLogger();

    /**
     * Mint
     * @param ref
     * @param token
     * @param tokenValue
     * @param documentOwner
     * @param root
     * @param targetAccount
     * @param messageId
     * @param transactionMemo
     * @param documents
     * @param userId
     */
    public static async mint(
        ref: AnyBlockType,
        token: Token,
        tokenValue: number,
        documentOwner: PolicyUser,
        root: IHederaCredentials,
        targetAccount: string,
        messageId: string,
        transactionMemo: string,
        documents: VcDocument[],
        userId: string
    ): Promise<void> {
        const multipleConfig = await MintService.getMultipleConfig(ref, documentOwner);
        const users = new Users();
        const documentOwnerUser = await users.getUserById(documentOwner.did, userId);
        const wallet = new Wallet();
        const signOptions = await wallet.getUserSignOptions(documentOwnerUser);
        const policyOwner = await users.getUserById(ref.policyOwner, userId);
        const notifier = NotificationHelper.init(
            [documentOwnerUser?.id, policyOwner?.id],
        );

        if (multipleConfig) {
            const hash = VcDocument.toCredentialHash(documents, (value: any) => {
                delete value.id;
                delete value.policyId;
                delete value.ref;
                return value;
            });
            await MintService.sendMessage(ref, multipleConfig, root, {
                hash,
                messageId,
                tokenId: token.tokenId,
                amount: tokenValue,
                memo: transactionMemo,
                target: targetAccount,
                userId: policyOwner?.id
            }, signOptions);
            if (multipleConfig.type === 'Main') {
                const user = await PolicyUtils.getUserCredentials(ref, documentOwner.did, userId);
                await DatabaseServer.createMultiPolicyTransaction({
                    uuid: GenerateUUIDv4(),
                    policyId: ref.policyId,
                    owner: documentOwner.did,
                    user: user.hederaAccountId,
                    hash,
                    tokenId: token.tokenId,
                    amount: tokenValue,
                    target: targetAccount,
                    status: 'Waiting'
                } as FilterObject<MultiPolicyTransaction>);
            }
        } else {
            const tokenConfig = await MintService.getTokenConfig(ref, token, policyOwner?.id);
            if (token.tokenType === 'non-fungible') {
                const serials = await MintService.mintNonFungibleTokens(
                    tokenConfig,
                    tokenValue,
                    root,
                    targetAccount,
                    messageId,
                    transactionMemo,
                    ref,
                    await notifier.progress(
                        'Minting tokens',
                        `Start minting ${token.tokenName}`
                    ),
                    policyOwner?.id
                );
                await MintService.updateDocuments(messageId, { tokenId: token.tokenId, serials }, ref);
            } else {
                const amount = await MintService.mintFungibleTokens(
                    tokenConfig, tokenValue, root, targetAccount, messageId, transactionMemo, ref
                );
                await MintService.updateDocuments(messageId, { tokenId: token.tokenId, amount }, ref);
            }
        }

        notifier.success(
            multipleConfig ? `Multi mint` : `Mint completed`,
            multipleConfig
                ? `Request to mint is submitted`
                : `All ${token.tokenName} tokens have been minted and transferred`,
            NotificationAction.POLICY_VIEW,
            ref.policyId
        );

        new ExternalEventChannel().publishMessage(
            ExternalMessageEvents.TOKEN_MINTED,
            {
                tokenId: token.tokenId,
                tokenValue,
                memo: transactionMemo
            }
        );
    }

    /**
     * Mint
     * @param token
     * @param tokenValue
     * @param root
     * @param targetAccount
     * @param ids
     * @param notifier
     * @param userId
     */
    public static async multiMint(
        root: IHederaCredentials,
        token: Token,
        tokenValue: number,
        targetAccount: string,
        ids: string[],
        notifier?: NotificationHelper,
        userId?: string
    ): Promise<void> {
        const messageIds = ids.join(',');
        const memo = messageIds;
        const tokenConfig: TokenConfig = {
            treasuryId: token.adminId,
            tokenId: token.tokenId,
            supplyKey: null,
            treasuryKey: null,
            tokenName: token.tokenName,
        }
        const [treasuryKey, supplyKey] = await Promise.all([
            MintService.wallet.getUserKey(
                token.owner,
                KeyType.TOKEN_TREASURY_KEY,
                token.tokenId,
                userId
            ),
            MintService.wallet.getUserKey(
                token.owner,
                KeyType.TOKEN_SUPPLY_KEY,
                token.tokenId,
                userId
            ),
        ]);
        tokenConfig.supplyKey = supplyKey;
        tokenConfig.treasuryKey = treasuryKey;

        if (token.tokenType === 'non-fungible') {
            const serials = await MintService.mintNonFungibleTokens(
                tokenConfig,
                tokenValue,
                root,
                targetAccount,
                messageIds,
                memo,
                null,
                await notifier?.progress(
                    'Minting tokens',
                    `Start minting ${token.tokenName}`
                ),
                userId
            );
            await MintService.updateDocuments(ids, { tokenId: token.tokenId, serials }, null);
        } else {
            const amount = await MintService.mintFungibleTokens(
                tokenConfig, tokenValue, root, targetAccount, messageIds, memo, null, userId
            );
            await MintService.updateDocuments(ids, { tokenId: token.tokenId, amount }, null);
        }

        notifier?.success(
            `Mint completed`,
            `All ${token.tokenName} tokens have been minted and transferred`
        );

        new ExternalEventChannel().publishMessage(
            ExternalMessageEvents.TOKEN_MINTED,
            {
                tokenId: token.tokenId,
                tokenValue,
                memo
            }
        );
    }

    /**
     * Get token keys
     * @param ref
     * @param token
     * @param userId
     */
    private static async getTokenConfig(ref: AnyBlockType, token: Token, userId: string | null): Promise<TokenConfig> {
        const tokenConfig: TokenConfig = {
            treasuryId: token.draftToken ? '0.0.0' : token.adminId,
            tokenId: token.draftToken ? '0.0.0' : token.tokenId,
            supplyKey: null,
            treasuryKey: null,
            tokenName: token.tokenName,
        }
        if (ref.dryRun) {
            const tokenPK = PrivateKey.generate().toString();
            tokenConfig.supplyKey = tokenPK;
            tokenConfig.treasuryKey = tokenPK;
        } else {
            const [treasuryKey, supplyKey] = await Promise.all([
                MintService.wallet.getUserKey(
                    token.owner,
                    KeyType.TOKEN_TREASURY_KEY,
                    token.tokenId,
                    userId
                ),
                MintService.wallet.getUserKey(
                    token.owner,
                    KeyType.TOKEN_SUPPLY_KEY,
                    token.tokenId,
                    userId
                ),
            ]);
            tokenConfig.supplyKey = supplyKey;
            tokenConfig.treasuryKey = treasuryKey;
        }
        return tokenConfig;
    }

    /**
     * Mint Non Fungible Tokens
     * @param token
     * @param tokenValue
     * @param root
     * @param targetAccount
     * @param uuid
     * @param transactionMemo
     * @param ref
     * @param notifier
     * @param userId
     */
    private static async mintNonFungibleTokens(
        token: TokenConfig,
        tokenValue: number,
        root: IHederaCredentials,
        targetAccount: string,
        uuid: string,
        transactionMemo: string,
        ref?: AnyBlockType,
        notifier?: NotificationHelper,
        userId?: string
    ): Promise<any[]> {
        const mintNFT = (metaData: string[]): Promise<number[]> =>
            workers.addRetryableTask(
                {
                    type: WorkerTaskType.MINT_NFT,
                    data: {
                        hederaAccountId: root.hederaAccountId,
                        hederaAccountKey: root.hederaAccountKey,
                        dryRun: ref && ref.dryRun,
                        tokenId: token.tokenId,
                        supplyKey: token.supplyKey,
                        metaData,
                        transactionMemo,
                        payload: { userId }
                    },
                },
                1, 10, userId
            );
        const transferNFT = (serials: number[]): Promise<number[] | null> => {
            MintService.logger.debug(
                `Transfer ${token?.tokenId} serials: ${JSON.stringify(serials)}`,
                ['POLICY_SERVICE', mintId.toString()],
                userId
            );
            return workers.addRetryableTask(
                {
                    type: WorkerTaskType.TRANSFER_NFT,
                    data: {
                        hederaAccountId:
                            root.hederaAccountId,
                        hederaAccountKey:
                            root.hederaAccountKey,
                        dryRun: ref && ref.dryRun,
                        tokenId: token.tokenId,
                        targetAccount,
                        treasuryId: token.treasuryId,
                        treasuryKey: token.treasuryKey,
                        element: serials,
                        transactionMemo,
                        payload: { userId }
                    },
                },
                1, 10, userId
            );
        };
        const mintAndTransferNFT = async (metaData: string[]) => {
            try {
                return await transferNFT(await mintNFT(metaData));
            } catch (e) {
                return null;
            }
        }
        const mintId = Date.now();
        MintService.log(`Mint(${mintId}): Start (Count: ${tokenValue})`, ref, userId);

        const result: number[] = [];
        const workers = new Workers();
        const data = new Array<string>(Math.floor(tokenValue));
        data.fill(uuid);
        const dataChunks = PolicyUtils.splitChunk(data, 10);
        const tasks = PolicyUtils.splitChunk(
            dataChunks,
            MintService.BATCH_NFT_MINT_SIZE
        );
        for (let i = 0; i < tasks.length; i++) {
            const dataChunk = tasks[i];
            MintService.log(
                `Mint(${mintId}): Minting and transferring (Chunk: ${i * MintService.BATCH_NFT_MINT_SIZE + 1
                }/${tasks.length * MintService.BATCH_NFT_MINT_SIZE})`,
                ref,
                userId
            );
            notifier?.step(
                `Mint(${token.tokenName}): Minting and transferring (Chunk: ${i * MintService.BATCH_NFT_MINT_SIZE + 1
                }/${tasks.length * MintService.BATCH_NFT_MINT_SIZE})`,
                (i * MintService.BATCH_NFT_MINT_SIZE +
                    1) / (tasks.length * MintService.BATCH_NFT_MINT_SIZE) *
                100
            );
            try {
                const results = await Promise.all(dataChunk.map(mintAndTransferNFT));
                for (const serials of results) {
                    if (Array.isArray(serials)) {
                        for (const n of serials) {
                            result.push(n);
                        }
                    }
                }
            } catch (error) {
                notifier?.stop({
                    title: 'Minting tokens',
                    message: `Mint(${token.tokenName
                        }): Error (${PolicyUtils.getErrorMessage(error)})`,
                });
                MintService.error(
                    `Mint(${mintId}): Error (${PolicyUtils.getErrorMessage(
                        error
                    )})`,
                    ref,
                    userId
                );
                throw error;
            }
        }

        notifier?.finish();

        MintService.log(
            `Mint(${mintId}): Minted (Count: ${Math.floor(tokenValue)})`,
            ref,
            userId
        );
        MintService.log(
            `Mint(${mintId}): Transferred ${token.treasuryId} -> ${targetAccount} `,
            ref,
            userId
        );
        MintService.log(`Mint(${mintId}): End`, ref, userId);

        return result;
    }

    /**
     * Mint Fungible Tokens
     * @param token
     * @param tokenValue
     * @param root
     * @param targetAccount
     * @param uuid
     * @param transactionMemo
     * @param ref
     * @param userId
     */
    private static async mintFungibleTokens(
        token: TokenConfig,
        tokenValue: number,
        root: IHederaCredentials,
        targetAccount: string,
        uuid: string,
        transactionMemo: string,
        ref?: AnyBlockType,
        userId?: string
    ): Promise<number | null> {
        const mintId = Date.now();
        MintService.log(`Mint(${mintId}): Start (Count: ${tokenValue})`, ref, userId);

        let result: number | null = null;
        try {
            const workers = new Workers();
            await workers.addRetryableTask({
                type: WorkerTaskType.MINT_FT,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    dryRun: ref && ref.dryRun,
                    tokenId: token.tokenId,
                    supplyKey: token.supplyKey,
                    tokenValue,
                    transactionMemo,
                    payload: { userId }
                }
            }, 10, 0, userId);
            await workers.addRetryableTask({
                type: WorkerTaskType.TRANSFER_FT,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    dryRun: ref && ref.dryRun,
                    tokenId: token.tokenId,
                    targetAccount,
                    treasuryId: token.treasuryId,
                    treasuryKey: token.treasuryKey,
                    tokenValue,
                    transactionMemo,
                    payload: { userId }
                }
            }, 10, 0, userId);
            result = tokenValue;
        } catch (error) {
            result = null;
            MintService.error(`Mint FT(${mintId}): Mint/Transfer Error (${PolicyUtils.getErrorMessage(error)})`, ref, userId);
        }

        MintService.log(`Mint(${mintId}): End`, ref, userId);

        return result;
    }

    /**
     * Send Synchronization Message
     * @param ref
     * @param multipleConfig
     * @param root
     * @param data
     * @param signOptions
     * @param userId
     */
    private static async sendMessage(
        ref: AnyBlockType,
        multipleConfig: MultiPolicy,
        root: IHederaCredentials,
        data: any,
        signOptions: ISignOptions,
        userId?: string
    ) {
        const message = new SynchronizationMessage(MessageAction.Mint);
        message.setDocument(multipleConfig, data);
        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, signOptions, ref.dryRun);
        const topic = new TopicConfig({ topicId: multipleConfig.synchronizationTopicId }, null, null);
        await messageServer
            .setTopicObject(topic)
            .sendMessage(message, true, null, userId);
    }

    /**
     * Wipe
     * @param ref
     * @param token
     * @param tokenValue
     * @param root
     * @param targetAccount
     * @param uuid
     * @param userId
     */
    public static async wipe(
        ref: AnyBlockType,
        token: Token,
        tokenValue: number,
        root: IHederaCredentials,
        targetAccount: string,
        uuid: string,
        userId: string | null
    ): Promise<void> {
        const workers = new Workers();
        if (token.wipeContractId) {
            await workers.addNonRetryableTask(
                {
                    type: WorkerTaskType.CONTRACT_CALL,
                    data: {
                        contractId: token.wipeContractId,
                        hederaAccountId: root.hederaAccountId,
                        hederaAccountKey: root.hederaAccountKey,
                        functionName: 'wipe',
                        gas: 1000000,
                        parameters: [
                            {
                                type: ContractParamType.ADDRESS,
                                value: TokenId.fromString(
                                    token.tokenId
                                ).toSolidityAddress(),
                            },
                            {
                                type: ContractParamType.ADDRESS,
                                value: AccountId.fromString(
                                    targetAccount
                                ).toSolidityAddress(),
                            },
                            {
                                type: ContractParamType.INT64,
                                value: tokenValue
                            }
                        ],
                        payload: { userId }
                    },
                },
                20
            );
        } else {
            const wipeKey = await MintService.wallet.getUserKey(
                token.owner,
                KeyType.TOKEN_WIPE_KEY,
                token.tokenId,
                userId
            );
            await workers.addRetryableTask({
                type: WorkerTaskType.WIPE_TOKEN,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    dryRun: ref.dryRun,
                    token,
                    wipeKey,
                    targetAccount,
                    tokenValue,
                    uuid,
                    payload: { userId }
                }
            }, 10);
        }
    }

    /**
     * Update VP Documents
     * @param ids
     * @param value
     * @param ref
     */
    private static async updateDocuments(ids: string | string[], value: any, ref: AnyBlockType) {
        const dryRunId = ref ? ref.dryRun : null;
        const filter = Array.isArray(ids) ? {
            messageId: { $in: ids }
        } : {
            messageId: { $eq: ids }
        }
        await DatabaseServer.updateVpDocuments(value, filter, dryRunId);
    }

    /**
     * Get Multiple Link
     * @param ref
     * @param documentOwner
     */
    private static async getMultipleConfig(ref: AnyBlockType, documentOwner: PolicyUser) {
        return await DatabaseServer.getMultiPolicy(ref.policyInstance.instanceTopicId, documentOwner.did);
    }

    /**
     * Write log message
     * @param message
     * @param ref
     * @param userId
     */
    public static log(message: string, ref?: AnyBlockType, userId: string | null = null) {
        if (ref) {
            MintService.logger.info(message, ['GUARDIAN_SERVICE', ref.uuid, ref.blockType, ref.tag, ref.policyId], userId);
        } else {
            MintService.logger.info(message, ['GUARDIAN_SERVICE'], userId);
        }

    }

    /**
     * Write error message
     * @param message
     */
    public static error(message: string, ref?: AnyBlockType, userId: string | null = null) {
        if (ref) {
            MintService.logger.error(message, ['GUARDIAN_SERVICE', ref.uuid, ref.blockType, ref.tag, ref.policyId], userId);
        } else {
            MintService.logger.error(message, ['GUARDIAN_SERVICE'], userId);
        }

    }

    /**
     * Write warn message
     * @param message
     */
    public static warn(message: string, ref?: AnyBlockType, userId: string | null = null) {
        if (ref) {
            MintService.logger.warn(message, ['GUARDIAN_SERVICE', ref.uuid, ref.blockType, ref.tag, ref.policyId], userId);
        } else {
            MintService.logger.warn(message, ['GUARDIAN_SERVICE'], userId);
        }

    }
}
