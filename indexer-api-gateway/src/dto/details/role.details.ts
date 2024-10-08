import {
    MessageAction,
    MessageType,
    Role,
    RoleActivity,
    RoleAnalytics,
    RoleDetails,
    RoleOptions,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsActivityDTO } from './details.interface.js';
import { RawMessageDTO } from '../raw-message.dto.js';

export class RoleOptionsDTO implements RoleOptions {
    @ApiProperty({
        description: 'Role',
        example: 'Registrant',
    })
    role: string;
    @ApiProperty({
        description: 'Role',
        example: 'Registrants',
    })
    group: string;
    @ApiProperty({
        description: 'Issuer',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    issuer: string;
}

export class RoleAnalyticsDTO implements RoleAnalytics {
    @ApiProperty({
        description: 'Policy message identifier',
        example: '1706823227.586179534',
    })
    policyId: string;
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class RoleActivityDTO implements RoleActivity {
    @ApiProperty({
        description: 'VCs',
        example: 10,
    })
    vcs: number;
}

export class RoleDTO
    extends MessageDTO<RoleOptionsDTO, RoleAnalyticsDTO>
    implements Role
{
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.ROLE_DOCUMENT,
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.CreateVC,
    })
    declare action: MessageAction;
    @ApiProperty({
        type: RoleOptionsDTO,
    })
    declare options: RoleOptionsDTO;
    @ApiProperty({
        type: RoleAnalyticsDTO,
    })
    declare analytics?: RoleAnalyticsDTO;
}

export class RoleDetailsDTO
    extends DetailsActivityDTO<RoleDTO, RoleActivityDTO>
    implements RoleDetails
{
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    declare uuid?: string;
    @ApiProperty({
        type: RoleDTO,
    })
    declare item?: RoleDTO;
    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;
    @ApiProperty({
        type: RoleActivityDTO,
    })
    declare activity?: RoleActivityDTO;
}
