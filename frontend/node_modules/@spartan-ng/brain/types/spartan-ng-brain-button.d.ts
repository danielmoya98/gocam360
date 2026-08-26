import * as i0 from '@angular/core';
import { BooleanInput } from '@angular/cdk/coercion';

declare class BrnButton {
    readonly disabled: i0.InputSignalWithTransform<boolean, BooleanInput>;
    protected readonly _isAnchor: boolean;
    private readonly _elementRef;
    constructor();
    static ɵfac: i0.ɵɵFactoryDeclaration<BrnButton, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<BrnButton, "a[brnButton], button[brnButton]", never, { "disabled": { "alias": "disabled"; "required": false; "isSignal": true; }; }, {}, never, never, true, never>;
}

declare const BrnButtonImports: readonly [typeof BrnButton];

export { BrnButton, BrnButtonImports };
