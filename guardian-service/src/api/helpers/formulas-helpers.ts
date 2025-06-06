import { DatabaseServer, Formula, FormulaImportExport, FormulaMessage, MessageAction, MessageServer, TopicConfig, VcDocument, VpDocument } from '@guardian/common';
import { EntityStatus, IOwner, IRootConfig } from '@guardian/interfaces';
import { INotifier } from '../../helpers/notifier.js';

type IDocument = VcDocument | VpDocument;

async function findRelationships(target: IDocument): Promise<IDocument[]> {
    if (!target) {
        return [];
    }

    const prevRelationships = new Map<string, IDocument>();
    prevRelationships.set(target.messageId, target);

    await addRelationships(target, prevRelationships);

    return Array.from(prevRelationships.values());
}

async function addRelationships(doc: IDocument, relationships: Map<string, IDocument>) {
    if (doc && doc.relationships) {
        for (const id of doc.relationships) {
            await addRelationship(id, relationships);
        }
    }
}

async function addRelationship(messageId: string, relationships: Map<string, IDocument>) {
    if (!messageId || relationships.has(messageId)) {
        return;
    }
    const doc = await DatabaseServer.getVC({ messageId });
    relationships.set(messageId, doc);
    await addRelationships(doc, relationships);
}

function checkDocument(document: any, policyId: string, owner: IOwner): boolean {
    return (document.policyId === policyId);
}

export async function getFormulasData(
    option: {
        policyId: string,
        schemaId: string,
        documentId: string,
        parentId: string
    },
    owner: IOwner
) {
    const { policyId, documentId, parentId } = option;

    const result: {
        document: IDocument | null,
        relationships: IDocument[]
    } = {
        document: null,
        relationships: []
    }

    if (documentId) {
        const vc = await DatabaseServer.getVCById(documentId);
        if (vc) {
            result.document = vc;
            result.relationships = await findRelationships(vc);
        } else {
            const vp = await DatabaseServer.getVPById(documentId);
            if (vp) {
                result.document = vp;
                result.relationships = await findRelationships(vp);
            }
        }
    }

    if (parentId) {
        const doc = await DatabaseServer.getVCById(parentId);
        if (doc) {
            result.relationships = await findRelationships(doc);
        }
    }

    if (result.document) {
        if (!checkDocument(result.document, policyId, owner)) {
            result.document = null;
        }
    }

    if (result.relationships) {
        result.relationships = result.relationships.filter((doc) => checkDocument(doc, policyId, owner));
    }

    return result;
}

export async function publishFormula(
    item: Formula,
    owner: IOwner,
    root: IRootConfig,
    notifier: INotifier
): Promise<Formula> {
    item.status = EntityStatus.PUBLISHED;

    notifier.completedAndStart('Resolve topic');
    const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.policyTopicId), true, owner.id);
    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, root.signOptions)
        .setTopicObject(topic);

    notifier.completedAndStart('Publish formula');
    const zip = await FormulaImportExport.generate(item);
    const buffer = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: {
            level: 3
        }
    });

    const publishMessage = new FormulaMessage(MessageAction.PublishFormula);
    publishMessage.setDocument(item, buffer);
    const statMessageResult = await messageServer
        .sendMessage(publishMessage, true, null, owner.id);

    item.messageId = statMessageResult.getId();

    const result = await DatabaseServer.updateFormula(item);
    return result;
}
