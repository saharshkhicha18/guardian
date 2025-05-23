import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
    SimpleChanges
} from '@angular/core';
import {RegisteredService} from '../../services/registered.service';
import {PolicyBlock, PolicyFolder} from '../../structures';

type ValueType = string | PolicyBlock | null | undefined;

/**
 * SelectBlock.
 */
@Component({
    selector: 'select-block',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './select-block.component.html',
    styleUrls: ['./select-block.component.scss']
})
export class SelectBlock implements AfterViewInit {
    private searchTimeout!: any;
    private data?: any[];
    @Input('root') root!: PolicyFolder;
    @Input('blocks') blocks!: PolicyBlock[];
    @Input('readonly') readonly!: boolean;
    @Input('value') value: ValueType | ValueType[];
    @Input('type') type!: string;
    @Output('valueChange') valueChange = new EventEmitter<any>();
    @Output('change') change = new EventEmitter<any>();
    @Input() multiple: boolean = false;
    public text: string | null | undefined;
    public search: string = '';
    public searchData?: any[];

    constructor(private registeredService: RegisteredService) {
    }

    selectedId: string | string[] | null = null;

    private getText(value: string | PolicyBlock | null | undefined): string {
        if (value && typeof value === 'object') {
            if (value === this.root) {
                if (this.root.isModule) {
                    return 'Module';
                } else if (this.root.isTool) {
                    return 'Tool';
                } else {
                    return 'Policy';
                }
            } else {
                return value.localTag;
            }
        }
        if (value) {
            return value;
        } else {
            return '';
        }
    }

    private getIcon(value: PolicyBlock) {
        if (value === this.root) {
            if (this.root.isModule) {
                return {icon: 'policy-module', svg: true};
            } else if (this.root.isTool) {
                return {icon: 'handyman', svg: false};
            } else {
                return {icon: 'article', svg: false};
            }
        } else {
            return {
                icon: this.registeredService.getIcon(value.blockType),
                svg: false
            };
        }
    }

    private getFullText(): string {
        if (this.multiple) {
            if (this.value) {
                return (this.value as ValueType[])
                    .map((item: ValueType) => this.getText(item))
                    .join(', ')
            } else {
                return '';
            }
        } else {
            return this.getText(this.value as ValueType);
        }
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.onChange();
        }, 100)
    }

    onChange() {
        if (this.multiple) {
            const result = [];

            for (const id of this.selectedId ?? []) {
                const foundItem = this.searchData?.find(item => item.id === id);

                if (foundItem?.original) {
                    result.push(foundItem.original);
                }
            }

            this.value = result;
        } else {
            const selected = this.searchData?.find(item => item.id === this.selectedId);
            this.value = selected?.original || null;
        }

        this.text = this.getFullText();
        this.valueChange.emit(this.value);
        this.change.emit();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.multiple) {
            this.selectedId = Array.isArray(this.value)
                ? (this.value as PolicyBlock[]).map(v => v?.id)
                : [];
        } else {
            this.selectedId = this.value && typeof this.value === 'object'
                ? (this.value as PolicyBlock).id
                : (this.value as string || null);
        }

        this.text = this.getFullText();

        setTimeout(() => {
            this.data = [];
            if (this.blocks) {
                for (const block of this.blocks) {
                    const search = (block.tag || '').toLocaleLowerCase();
                    const root = block === this.root;
                    const name = this.getText(block);
                    const icon = this.getIcon(block);
                    this.data.push({
                        name,
                        value: this.type === 'object' ? block : block.tag,
                        id: block.id,
                        original: block,
                        icon: icon.icon,
                        svg: icon.svg,
                        root,
                        search
                    });
                }
            }
            this.update();
        }, 0);
    }

    public onSearch(event: any) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.update();
        }, 200);
    }

    public update() {
        const search = this.search ? this.search.toLowerCase() : null;
        if (search) {
            this.searchData = this.data?.filter(item => item.search.indexOf(search) !== -1);
        } else {
            this.searchData = this.data;
        }
    }
}
