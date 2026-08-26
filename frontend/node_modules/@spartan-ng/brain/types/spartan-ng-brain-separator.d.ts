import * as _angular_core from '@angular/core';
import { ValueProvider } from '@angular/core';
import { BooleanInput } from '@angular/cdk/coercion';

type SeparatorOrientation = 'horizontal' | 'vertical';
interface BrnSeparatorConfig {
    orientation: SeparatorOrientation;
}
declare function provideBrnSeparatorConfig(config: Partial<BrnSeparatorConfig>): ValueProvider;
declare function injectBrnSeparatorConfig(): BrnSeparatorConfig;

declare class BrnSeparator {
    private readonly _config;
    /** Orientation of the separator. */
    readonly orientation: _angular_core.InputSignal<SeparatorOrientation>;
    /** Whether the separator is decorative. */
    readonly decorative: _angular_core.InputSignalWithTransform<boolean, BooleanInput>;
    protected readonly _role: _angular_core.Signal<"none" | "separator">;
    protected readonly _ariaOrientation: _angular_core.Signal<"vertical" | undefined>;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<BrnSeparator, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<BrnSeparator, "[brnSeparator],brn-separator", never, { "orientation": { "alias": "orientation"; "required": false; "isSignal": true; }; "decorative": { "alias": "decorative"; "required": false; "isSignal": true; }; }, {}, never, never, true, never>;
}

declare const BrnSeparatorImports: readonly [typeof BrnSeparator];

export { BrnSeparator, BrnSeparatorImports, injectBrnSeparatorConfig, provideBrnSeparatorConfig };
export type { BrnSeparatorConfig, SeparatorOrientation };
