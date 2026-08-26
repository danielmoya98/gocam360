import * as _angular_core from '@angular/core';
import { OnChanges, SimpleChanges } from '@angular/core';
import { NumberInput } from '@angular/cdk/coercion';
import * as _spartan_ng_brain_progress from '@spartan-ng/brain/progress';

declare class BrnProgress implements OnChanges {
    /**
     * The current progress value.
     */
    readonly value: _angular_core.InputSignalWithTransform<number | null | undefined, NumberInput>;
    /**
     * The maximum progress value.
     */
    readonly max: _angular_core.InputSignalWithTransform<number, NumberInput>;
    /**
     * A function that returns the label for the current progress value.
     */
    readonly getValueLabel: _angular_core.InputSignal<BrnProgressLabelFn>;
    protected readonly _label: _angular_core.Signal<string | undefined>;
    readonly state: _angular_core.Signal<"indeterminate" | "complete" | "loading">;
    ngOnChanges(changes: SimpleChanges): void;
    private validate;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<BrnProgress, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<BrnProgress, "brn-progress", ["brnProgress"], { "value": { "alias": "value"; "required": false; "isSignal": true; }; "max": { "alias": "max"; "required": false; "isSignal": true; }; "getValueLabel": { "alias": "getValueLabel"; "required": false; "isSignal": true; }; }, {}, never, never, true, never>;
}
type BrnProgressLabelFn = (value: number, max: number) => string;

declare class BrnProgressIndicator {
    protected readonly _progress: _spartan_ng_brain_progress.BrnProgress;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<BrnProgressIndicator, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<BrnProgressIndicator, "brn-progress-indicator", never, {}, {}, never, never, true, never>;
}

declare function injectBrnProgress(): BrnProgress;

declare const BrnProgressImports: readonly [typeof BrnProgress, typeof BrnProgressIndicator];

export { BrnProgress, BrnProgressImports, BrnProgressIndicator, injectBrnProgress };
export type { BrnProgressLabelFn };
