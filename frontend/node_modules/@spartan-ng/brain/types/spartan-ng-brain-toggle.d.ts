import * as _angular_core from '@angular/core';
import { BooleanInput } from '@angular/cdk/coercion';

declare class BrnToggle<T> {
    private static _uniqueId;
    /** The id of the toggle. */
    readonly id: _angular_core.InputSignal<string>;
    /** The value this toggle represents. */
    readonly value: _angular_core.InputSignal<T | undefined>;
    /** Whether the toggle is disabled. */
    readonly disabled: _angular_core.InputSignalWithTransform<boolean, BooleanInput>;
    /** The current state of the toggle when not used in a group. */
    readonly state: _angular_core.ModelSignal<"on" | "off">;
    /** The type of the button. */
    readonly type: _angular_core.InputSignal<"button" | "submit" | "reset">;
    /**
     * Accessibility label for screen readers.
     * Use when no visible label exists.
     */
    readonly ariaLabel: _angular_core.InputSignal<string | null>;
    /** Whether the toggle is in the on state. */
    protected readonly _isOn: _angular_core.Signal<boolean>;
    toggle(): void;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<BrnToggle<any>, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<BrnToggle<any>, "button[brnToggle]", never, { "id": { "alias": "id"; "required": false; "isSignal": true; }; "value": { "alias": "value"; "required": false; "isSignal": true; }; "disabled": { "alias": "disabled"; "required": false; "isSignal": true; }; "state": { "alias": "state"; "required": false; "isSignal": true; }; "type": { "alias": "type"; "required": false; "isSignal": true; }; "ariaLabel": { "alias": "aria-label"; "required": false; "isSignal": true; }; }, { "state": "stateChange"; }, never, never, true, never>;
}

declare const BrnToggleImports: readonly [typeof BrnToggle];

export { BrnToggle, BrnToggleImports };
