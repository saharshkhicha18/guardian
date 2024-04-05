import { BaseEntity } from '../models';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { AfterDelete, BeforeCreate, BeforeUpdate, Entity, OnLoad, Property } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers';

/**
 * Record collection
 */
@Entity()
export class Record extends BaseEntity {
    /**
     * UUID
     */
    @Property({
        nullable: true,
        index: true
    })
    uuid?: string;

    /**
     * Policy
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Method
     */
    @Property({ nullable: true })
    method?: string;

    /**
     * Action
     */
    @Property({ nullable: true })
    action?: string;

    /**
     * Time
     */
    @Property({ nullable: true, type: 'unknown' })
    time?: Date;

    /**
     * User
     */
    @Property({ nullable: true })
    user?: string;

    /**
     * Target
     */
    @Property({ nullable: true })
    target?: string;

    /**
     * Document
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
        try {
            if (this.documentFileId) {
                const fileStream = DataBaseHelper.gridFS.openDownloadStream(
                    this.documentFileId
                );
                const bufferArray = [];
                for await (const data of fileStream) {
                    bufferArray.push(data);
                }
                const buffer = Buffer.concat(bufferArray);
                this.document = JSON.parse(buffer.toString());
            }
        } catch (error) {
            console.error(error.message)
        }
    }

    /**
     * Delete context
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
