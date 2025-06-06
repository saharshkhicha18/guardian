import { User } from '../entity/user.js';
import { DatabaseServer, MessageError, MessageResponse, NatsService, PinoLogger, Singleton } from '@guardian/common';
import { GenerateUUIDv4, IGetGlobalApplicationKey, IGetKeyMessage, IGetKeyResponse, ISetGlobalApplicationKey, ISetKeyMessage, WalletEvents } from '@guardian/interfaces';
import { IVault } from '../vaults/index.js';

/**
 * Wallet service
 */
@Singleton
export class WalletService extends NatsService {

    /**
     * Message queue name
     */
    public messageQueueName = 'wallet-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'wallet-queue-reply-' + GenerateUUIDv4();

    /**
     * Vault
     * @private
     */
    private vault: IVault

    /**
     * Register vault
     * @param vault
     */
    registerVault(vault: IVault): WalletService {
        this.vault = vault;
        return this;
    }

    /**
     * Register listeners
     */
    registerListeners(logger: PinoLogger): void {
        this.getMessages<IGetKeyMessage, IGetKeyResponse>(WalletEvents.GET_KEY, async (msg) => {
            const { token, type, key, userId } = msg;

            try {
                const value = await this.vault.getKey(token, type, key);
                return new MessageResponse({ key: value });
            } catch (error) {
                await logger.error(error, ['AUTH_SERVICE'], userId);
                return new MessageError(error)
            }
        });

        this.getMessages<ISetKeyMessage, null>(WalletEvents.SET_KEY, async (msg) => {
            const { token, type, key, value, userId } = msg;

            try {
                await this.vault.setKey(token, type, key, value);
                return new MessageResponse(null);
            } catch (error) {
                await logger.error(error, ['AUTH_SERVICE'], userId);
                return new MessageError(error);
            }
        });

        this.getMessages<any, IGetKeyResponse>(WalletEvents.GET_USER_KEY, async (msg) => {
            const { did, type, key, userId } = msg;

            try {
                if (!did) {
                    return new MessageResponse({ key: null });
                }
                const user = await new DatabaseServer().findOne(User, { did });
                const value = await this.vault.getKey(user.walletToken, type, key);
                return new MessageResponse({ key: value });
            } catch (error) {
                await logger.error(error, ['AUTH_SERVICE'], userId);
                return new MessageError(error)
            }
        });

        this.getMessages<any, null>(WalletEvents.SET_USER_KEY, async (msg) => {
            const { did, type, key, value, userId } = msg;

            try {
                if (!did) {
                    return new MessageResponse(null);
                }
                const user = await new DatabaseServer().findOne(User, { did });
                await this.vault.setKey(user.walletToken, type, key, value);
                return new MessageResponse(null);
            } catch (error) {
                await logger.error(error, ['AUTH_SERVICE'], userId);
                return new MessageError(error);
            }
        });

        this.getMessages<IGetGlobalApplicationKey, IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, async (msg) => {
            const {type, userId} = msg;

            try {
                const key = await this.vault.getGlobalApplicationKey(type);
                return new MessageResponse({key});
            } catch (error) {
                await logger.error(error, ['AUTH_SERVICE'], userId);
                return new MessageError(error);
            }
        });

        this.getMessages<ISetGlobalApplicationKey, null>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, async (msg) => {
            const {type, key, userId} = msg;

            try {
                await this.vault.setGlobalApplicationKey(type, key);
                return new MessageResponse(null);
            } catch (error) {
                await logger.error(error, ['AUTH_SERVICE'], userId);
                return new MessageError(error);
            }
        });
    }
}
