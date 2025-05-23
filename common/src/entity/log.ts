import { Entity, Enum, Property } from '@mikro-orm/core';
import { ILog, LogType } from '@guardian/interfaces';
import { BaseEntity } from '../models/base-entity.js';

/**
 * Log message
 */
@Entity()
export class Log extends BaseEntity implements ILog {
    /**
     * Message
     */
    @Property()
    message: string;

    /**
     * Type
     */
    @Enum()
    type: LogType;

    /**
     * Datetime
     */
    @Property({
        index: true
    })
    datetime: Date = new Date();

    /**
     * Attributes
     */
    @Property({
        nullable: true,
        index: true
    })
    attributes?: string[];

    /**
     * User Id
     */
    @Property({ nullable: true, index: true })
    userId?: string;
}
