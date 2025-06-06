import {Component, Inject, OnInit} from '@angular/core';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

@Component({
    selector: 'app-confirmation-dialog',
    templateUrl: './confirmation-dialog.component.html',
    styleUrls: ['./confirmation-dialog.component.css']
})
export class ConfirmationDialogComponent implements OnInit {

    public dialogTitle!: string;
    public dialogText!: string;

    constructor(
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
    ) {
        const data = this.config.data

        this.dialogTitle = data.dialogTitle;
        this.dialogText = data.dialogText;
    }

    ngOnInit(): void {
    }

    onNoClick(): void {
        this.dialogRef.close(false);
    }

    onSubmit(): void {
        this.dialogRef.close(true);
    }
}
