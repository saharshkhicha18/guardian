import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock, TokenTemplateVariables, TokenVariables } from '../../../../structures';

/**
 * Settings for block of 'mintDocument' and 'wipeDocument' types.
 */
@Component({
    selector: 'token-action-config',
    templateUrl: './token-action-config.component.html',
    styleUrls: ['./token-action-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class TokenActionConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        main: false,
    };

    properties!: any;
    tokens!: TokenVariables[];
    tokenTemplate!: TokenTemplateVariables[];

    public accountTypeOptions = [
        { label: 'Default', value: 'default' },
        { label: 'Custom', value: 'custom' }
    ];

    public actionOptions = [
        { label: 'Associate', value: 'associate' },
        { label: 'Dissociate', value: 'dissociate' },
        { label: 'Freeze', value: 'freeze' },
        { label: 'Unfreeze', value: 'unfreeze' },
        { label: 'Grant Kyc', value: 'grantKyc' },
        { label: 'Revoke Kyc', value: 'revokeKyc' }
    ];

    public actionOptionsCustom = [
        { label: 'Freeze', value: 'freeze' },
        { label: 'Unfreeze', value: 'unfreeze' },
        { label: 'Grant Kyc', value: 'grantKyc' },
        { label: 'Revoke Kyc', value: 'revokeKyc' }
    ];

    constructor() {
    }

    ngOnInit(): void {
        this.tokens = [];
        this.tokenTemplate = [];
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlock) {
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.tokens = this.moduleVariables?.tokens || [];
        this.tokenTemplate = this.moduleVariables?.tokenTemplates || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    onUseTemplateChange() {
        delete this.properties.tokenId;
        delete this.properties.template;
    }

    onSave() {
        this.item.changed = true;
    }
}
