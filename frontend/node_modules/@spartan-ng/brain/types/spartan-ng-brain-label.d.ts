import * as _angular_core from '@angular/core';

declare class BrnLabel {
    private static _id;
    private readonly _brnField;
    /** The id of the label. */
    readonly id: _angular_core.InputSignal<string>;
    /** The id of the form control this label is associated with. */
    readonly for: _angular_core.InputSignal<string | undefined>;
    protected readonly _for: _angular_core.Signal<string | null | undefined>;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<BrnLabel, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<BrnLabel, "[brnLabel]", never, { "id": { "alias": "id"; "required": false; "isSignal": true; }; "for": { "alias": "for"; "required": false; "isSignal": true; }; }, {}, never, never, true, never>;
}

declare const BrnLabelImports: readonly [typeof BrnLabel];

export { BrnLabel, BrnLabelImports };
