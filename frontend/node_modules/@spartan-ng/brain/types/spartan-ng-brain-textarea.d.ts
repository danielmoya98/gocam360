import * as _angular_core from '@angular/core';
import { BooleanInput } from '@angular/cdk/coercion';
import * as i1 from '@spartan-ng/brain/field';

declare class BrnTextarea {
    private static _id;
    private readonly _fieldControl;
    /** The id of the textarea. */
    readonly id: _angular_core.InputSignal<string | undefined>;
    /** Whether to force the textarea into an invalid state. */
    readonly forceInvalid: _angular_core.InputSignalWithTransform<boolean, BooleanInput>;
    readonly labelableId: _angular_core.InputSignal<string | undefined>;
    protected readonly _ariaInvalid: _angular_core.Signal<boolean | null> | undefined;
    protected readonly _touched: _angular_core.Signal<boolean | null> | undefined;
    protected readonly _dirty: _angular_core.Signal<boolean | null> | undefined;
    protected readonly _spartanInvalid: _angular_core.Signal<boolean | null | undefined>;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<BrnTextarea, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<BrnTextarea, "[brnTextarea]", never, { "id": { "alias": "id"; "required": false; "isSignal": true; }; "forceInvalid": { "alias": "forceInvalid"; "required": false; "isSignal": true; }; }, {}, never, never, true, [{ directive: typeof i1.BrnFieldControl; inputs: {}; outputs: {}; }]>;
}

declare const BrnTextareaImports: readonly [typeof BrnTextarea];

export { BrnTextarea, BrnTextareaImports };
