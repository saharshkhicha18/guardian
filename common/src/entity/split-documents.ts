import { AfterDelete, BeforeCreate, BeforeUpdate, Entity, OnLoad, Property, } from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers';
import { GenerateUUIDv4 } from '@guardian/interfaces';

/**
 * Block state
 */
@Entity()
export class SplitDocuments extends BaseEntity {
    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Block id
     */
    @Property({
        nullable: true,
        index: true
    })
    blockId?: string;

    /**
     * User id
     */
    @Property({
        nullable: true,
        index: true
    })
    userId?: string;

    /**
     * Value
     */
    @Property({ nullable: true, type: 'unknown' })
    value?: any;

    /**
     * Document instance
     */
    @Property({ persist: false, type: 'unknown' })
    document?: any;

    /**
     * Document file id
     */
    @Property({ nullable: true })
    documentFileId?: ObjectId;

    /**
     * Create document
     */
    @BeforeCreate()
    async createDocument() {
        await new Promise<void>((resolve, reject) => {
            try {
                if (this.document) {
                    const fileStream = DataBaseHelper.gridFS.openUploadStream(
                        GenerateUUIDv4()
                    );
                    fileStream.on('finish', () => {
                        this.documentFileId = fileStream.id;
                        resolve()
                    });
                    fileStream.on('error', (error) => {
                        reject(error);
                    });
                    fileStream.write(JSON.stringify(this.document));
                    fileStream.end();
                } else {
                    resolve();
                }
            } catch (error) {
                reject(error)
            }
        });
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateDocument() {
        if (this.document) {
            if (this.documentFileId) {
                DataBaseHelper.gridFS
                    .delete(this.documentFileId)
                    .catch(console.error);
            }
            await this.createDocument();
        }
    }

    /**
     * Load document
     */
    @OnLoad()
    async loadDocument() {
        if (this.documentFileId) {
            try {
                const fileStream = DataBaseHelper.gridFS.openDownloadStream(
                    this.documentFileId
                );
                const bufferArray = [];
                for await (const data of fileStream) {
                    bufferArray.push(data);
                }
                const buffer = Buffer.concat(bufferArray);
                this.document = JSON.parse(buffer.toString());
            } catch (error) {
                console.error(error.message)
            }
        }
    }

    /**
     * Delete document
     */
    @AfterDelete()
    deleteDocument() {
        if (this.documentFileId) {
            DataBaseHelper.gridFS
                .delete(this.documentFileId)
                .catch(console.error);
        }
    }
}
