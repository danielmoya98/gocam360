import * as _angular_forms from '@angular/forms';
import { ValidationErrors, AbstractControl, FormGroupDirective, NgForm, NgControl } from '@angular/forms';
import * as _angular_core from '@angular/core';
import { Type, Provider, Signal } from '@angular/core';

interface ControlState {
    dirty: boolean;
    errors: ValidationErrors | null;
    invalid: boolean;
    spartanInvalid: boolean;
    touched: boolean;
}

type ChangeFn<T> = (value: T) => void;
type TouchFn = () => void;

/**
 * Provides a custom {@link ErrorStateMatcher} at the component or application level.
 *
 * @example <caption>Application-level (appConfig)</caption>
 * ```ts
 * provideErrorStateMatcher(ShowOnDirtyErrorStateMatcher)
 * ```
 *
 * @example <caption>Component-level</caption>
 * ```ts
 * providers: [provideErrorStateMatcher(ShowOnDirtyErrorStateMatcher)]
 * ```
 */
declare function provideErrorStateMatcher(matcher: Type<ErrorStateMatcher>): Provider;
/** Error state matcher that matches when a control is invalid and dirty. */
declare class ShowOnDirtyErrorStateMatcher implements ErrorStateMatcher {
    isInvalid(control: AbstractControl | null, form: FormGroupDirective | NgForm | null): boolean;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<ShowOnDirtyErrorStateMatcher, never>;
    static ɵprov: _angular_core.ɵɵInjectableDeclaration<ShowOnDirtyErrorStateMatcher>;
}
/**
 * Determines when a form control should be considered in an invalid (error) state.
 *
 * The return value of `isInvalid` is reflected as the `data-matches-spartan-invalid` attribute
 * on field components, which drives both error styling and the visibility of `HlmFieldError`
 * messages.
 *
 * The default implementation matches when the control is invalid and either touched or, for
 * template-driven forms, the parent `NgForm` has been submitted.
 *
 * Provide a custom implementation (e.g. `ShowOnDirtyErrorStateMatcher`) at the component or
 * application level to change when errors are shown.
 */
declare class ErrorStateMatcher {
    isInvalid(control: AbstractControl | null, form: FormGroupDirective | NgForm | null): boolean;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<ErrorStateMatcher, never>;
    static ɵprov: _angular_core.ɵɵInjectableDeclaration<ErrorStateMatcher>;
}

interface StateTracker {
    readonly controlState: Signal<ControlState | null>;
    readonly errors: Signal<ValidationErrors | null>;
    readonly dirty: Signal<boolean | null>;
    readonly invalid: Signal<boolean | null>;
    readonly spartanInvalid: Signal<boolean | null>;
    readonly touched: Signal<boolean | null>;
    destroy(): void;
}
declare function controlStateEqual(a: ControlState | null, b: ControlState | null): boolean;

declare function createStateTracker(ngControl: NgControl, matcher: ErrorStateMatcher | null, parentFormGroup: FormGroupDirective | null, parentForm: NgForm | null): StateTracker;

declare class ReactiveStateTracker implements StateTracker {
    private readonly _ngControl;
    private readonly _matcher;
    private readonly _parentFormGroup;
    private readonly _parentForm;
    private readonly _stateVersion;
    private readonly _eventsSubscription?;
    readonly controlState: _angular_core.Signal<ControlState | null>;
    readonly errors: _angular_core.Signal<_angular_forms.ValidationErrors | null>;
    readonly dirty: _angular_core.Signal<boolean | null>;
    readonly invalid: _angular_core.Signal<boolean | null>;
    readonly spartanInvalid: _angular_core.Signal<boolean | null>;
    readonly touched: _angular_core.Signal<boolean | null>;
    private get _controlParent();
    constructor(_ngControl: NgControl, _matcher: ErrorStateMatcher | null, _parentFormGroup: FormGroupDirective | null, _parentForm: NgForm | null);
    destroy(): void;
}

declare class SignalStateTracker implements StateTracker {
    private readonly _ngControl;
    private readonly _matcher;
    private readonly _parentFormGroup;
    private readonly _parentForm;
    private readonly _control;
    readonly dirty: _angular_core.Signal<boolean | null>;
    readonly touched: _angular_core.Signal<boolean | null>;
    readonly invalid: _angular_core.Signal<boolean | null>;
    readonly errors: _angular_core.Signal<_angular_forms.ValidationErrors | null>;
    readonly spartanInvalid: _angular_core.Signal<boolean | null>;
    readonly controlState: _angular_core.Signal<ControlState | null>;
    private get _controlParent();
    constructor(_ngControl: NgControl, _matcher: ErrorStateMatcher | null, _parentFormGroup: FormGroupDirective | null, _parentForm: NgForm | null);
    destroy(): void;
}

export { ErrorStateMatcher, ReactiveStateTracker, ShowOnDirtyErrorStateMatcher, SignalStateTracker, controlStateEqual, createStateTracker, provideErrorStateMatcher };
export type { ChangeFn, ControlState, StateTracker, TouchFn };
