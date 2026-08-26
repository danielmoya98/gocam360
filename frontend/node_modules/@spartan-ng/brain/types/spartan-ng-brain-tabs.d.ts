import * as _angular_cdk_bidi from '@angular/cdk/bidi';
import { Direction } from '@angular/cdk/bidi';
import * as _angular_core from '@angular/core';
import { OnDestroy, ElementRef, AfterContentInit, AfterContentChecked, AfterViewInit, Signal, ChangeDetectorRef } from '@angular/core';
import * as _spartan_ng_brain_tabs from '@spartan-ng/brain/tabs';
import { BooleanInput } from '@angular/cdk/coercion';
import { FocusableOption } from '@angular/cdk/a11y';
import { Observable, Subject } from 'rxjs';

declare class BrnTabsContent implements OnDestroy {
    private readonly _root;
    private readonly _elementRef;
    readonly contentFor: _angular_core.InputSignal<string>;
    protected readonly _isSelected: _angular_core.Signal<boolean>;
    protected readonly _contentId: _angular_core.Signal<string>;
    protected readonly _labelId: _angular_core.Signal<string>;
    constructor();
    focus(): void;
    ngOnDestroy(): void;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<BrnTabsContent, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<BrnTabsContent, "[brnTabsContent]", ["brnTabsContent"], { "contentFor": { "alias": "brnTabsContent"; "required": true; "isSignal": true; }; }, {}, never, never, true, never>;
}

declare class BrnTabsTrigger implements OnDestroy {
    readonly elementRef: ElementRef<any>;
    private readonly _root;
    protected readonly _orientation: _angular_core.InputSignal<_spartan_ng_brain_tabs.BrnTabsOrientation>;
    readonly triggerFor: _angular_core.InputSignal<string>;
    readonly selected: _angular_core.Signal<boolean>;
    protected readonly _contentId: _angular_core.Signal<string>;
    protected readonly _labelId: _angular_core.Signal<string>;
    readonly _disabled: _angular_core.InputSignalWithTransform<boolean, BooleanInput>;
    get disabled(): boolean;
    constructor();
    focus(): void;
    activate(): void;
    get key(): string | undefined;
    ngOnDestroy(): void;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<BrnTabsTrigger, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<BrnTabsTrigger, "button[brnTabsTrigger]", ["brnTabsTrigger"], { "triggerFor": { "alias": "brnTabsTrigger"; "required": true; "isSignal": true; }; "_disabled": { "alias": "disabled"; "required": false; "isSignal": true; }; }, {}, never, never, true, never>;
}

type BrnTabsOrientation = 'horizontal' | 'vertical';
type BrnTabsDirection = 'ltr' | 'rtl';
type BrnActivationMode = 'automatic' | 'manual';
type TabEntry = {
    trigger: BrnTabsTrigger;
    content: BrnTabsContent;
};
declare class BrnTabs {
    private readonly _dir;
    readonly orientation: _angular_core.InputSignal<BrnTabsOrientation>;
    /** internal **/
    $orientation: _angular_core.InputSignal<BrnTabsOrientation>;
    /** internal **/
    readonly direction: _angular_core.WritableSignal<_angular_cdk_bidi.Direction>;
    readonly activeTab: _angular_core.ModelSignal<string | undefined>;
    /** internal **/
    $activeTab: _angular_core.Signal<string | undefined>;
    readonly activationMode: _angular_core.InputSignal<BrnActivationMode>;
    /** internal **/
    $activationMode: _angular_core.InputSignal<BrnActivationMode>;
    readonly tabActivated: _angular_core.OutputEmitterRef<string>;
    private readonly _tabs;
    readonly $tabs: _angular_core.Signal<{
        [key: string]: TabEntry;
    }>;
    registerTrigger(key: string, trigger: BrnTabsTrigger): void;
    registerContent(key: string, content: BrnTabsContent): void;
    unregisterTrigger(key: string): void;
    unregisterContent(key: string): void;
    private updateEntry;
    emitTabActivated(key: string): void;
    setActiveTab(key: string): void;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<BrnTabs, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<BrnTabs, "[brnTabs]", ["brnTabs"], { "orientation": { "alias": "orientation"; "required": false; "isSignal": true; }; "activeTab": { "alias": "brnTabs"; "required": false; "isSignal": true; }; "activationMode": { "alias": "activationMode"; "required": false; "isSignal": true; }; }, { "activeTab": "brnTabsChange"; "tabActivated": "tabActivated"; }, never, never, true, never>;
}

declare class BrnTabsContentLazy {
    private readonly _root;
    private readonly _content;
    private readonly _templateRef;
    private readonly _viewContainerRef;
    private readonly _destroyRef;
    private _hasBeenActivated;
    constructor();
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<BrnTabsContentLazy, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<BrnTabsContentLazy, "ng-template[brnTabsContentLazy]", ["brnTabsContentLazy"], {}, {}, never, never, true, never>;
}

declare class BrnTabsList implements AfterContentInit {
    private readonly _root;
    protected readonly _orientation: _angular_core.InputSignal<_spartan_ng_brain_tabs.BrnTabsOrientation>;
    private readonly _direction;
    private readonly _activeTab;
    private readonly _tabs;
    private readonly _elementRef;
    private readonly _keyDownListener;
    private _keyManager?;
    readonly triggers: _angular_core.Signal<readonly BrnTabsTrigger[]>;
    ngAfterContentInit(): void;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<BrnTabsList, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<BrnTabsList, "[brnTabsList]", ["brnTabsList"], {}, {}, ["triggers"], never, true, never>;
}

/**
 * The directions that scrolling can go in when the header's tabs exceed the header width. 'After'
 * will scroll the header towards the end of the tabs list and 'before' will scroll towards the
 * beginning of the list.
 */
type ScrollDirection = 'after' | 'before';
/** Item inside a paginated tab header. */
type BrnPaginatedTabHeaderItem = FocusableOption & {
    elementRef: ElementRef;
};
/**
 * Base class for a tab header that supported pagination.
 * @docs-private
 */
declare abstract class BrnTabsPaginatedList implements AfterContentChecked, AfterContentInit, AfterViewInit, OnDestroy {
    abstract items: Signal<ReadonlyArray<BrnPaginatedTabHeaderItem>>;
    abstract itemsChanges: Observable<ReadonlyArray<BrnPaginatedTabHeaderItem>>;
    abstract tabListContainer: Signal<ElementRef<HTMLElement>>;
    abstract tabList: Signal<ElementRef<HTMLElement>>;
    abstract tabListInner: Signal<ElementRef<HTMLElement>>;
    abstract nextPaginator: Signal<ElementRef<HTMLElement>>;
    abstract previousPaginator: Signal<ElementRef<HTMLElement>>;
    /** The distance in pixels that the tab labels should be translated to the left. */
    private _scrollDistance;
    /** Whether the header should scroll to the selected index after the view has been checked. */
    private _selectedIndexChanged;
    private readonly _root;
    private readonly _activeTab;
    private readonly _tabs;
    /** Emits when the component is destroyed. */
    protected readonly _destroyed: Subject<void>;
    /** Whether the controls for pagination should be displayed */
    readonly showPaginationControls: _angular_core.WritableSignal<boolean>;
    /** Whether the tab list can be scrolled more towards the end of the tab label list. */
    disableScrollAfter: boolean;
    /** Whether the tab list can be scrolled more towards the beginning of the tab label list. */
    disableScrollBefore: boolean;
    /**
     * The number of tab labels that are displayed on the header. When this changes, the header
     * should re-evaluate the scroll position.
     */
    private _tabLabelCount;
    /** Whether the scroll distance has changed and should be applied after the view is checked. */
    private _scrollDistanceChanged;
    /** Used to manage focus between the tabs. */
    private _keyManager;
    /** Cached text content of the header. */
    private _currentTextContent;
    /** Stream that will stop the automated scrolling. */
    private readonly _stopScrolling;
    /**
     * Whether pagination should be disabled. This can be used to avoid unnecessary
     * layout recalculations if it's known that pagination won't be required.
     */
    readonly disablePagination: _angular_core.InputSignalWithTransform<boolean, BooleanInput>;
    /** The index of the active tab. */
    private readonly _selectedIndex;
    /** Event emitted when the option is selected. */
    readonly selectFocusedIndex: _angular_core.OutputEmitterRef<number>;
    /** Event emitted when a label is focused. */
    readonly indexFocused: _angular_core.OutputEmitterRef<number>;
    private readonly _sharedResizeObserver;
    private readonly _injector;
    protected _elementRef: ElementRef<HTMLElement>;
    protected _changeDetectorRef: ChangeDetectorRef;
    private readonly _viewportRuler;
    private readonly _dir;
    private readonly _ngZone;
    private readonly _platform;
    readonly animationMode: "NoopAnimations" | "BrowserAnimations" | null;
    constructor();
    /** Called when the user has selected an item via the keyboard. */
    protected abstract _itemSelected(event: KeyboardEvent): void;
    ngAfterViewInit(): void;
    ngAfterContentInit(): void;
    /** Sends any changes that could affect the layout of the items. */
    private _itemsResized;
    ngAfterContentChecked(): void;
    ngOnDestroy(): void;
    /** Handles keyboard events on the header. */
    _handleKeydown(event: KeyboardEvent): void;
    /**
     * Callback for when the MutationObserver detects that the content has changed.
     */
    _onContentChanges(): void;
    /**
     * Updates the view whether pagination should be enabled or not.
     *
     * WARNING: Calling this method can be very costly in terms of performance. It should be called
     * as infrequently as possible from outside of the Tabs component as it causes a reflow of the
     * page.
     */
    updatePagination(): void;
    /** Tracks which element has focus; used for keyboard navigation */
    get focusIndex(): number;
    /** When the focus index is set, we must manually send focus to the correct label */
    set focusIndex(value: number);
    /**
     * Determines if an index is valid.  If the tabs are not ready yet, we assume that the user is
     * providing a valid index and return true.
     */
    _isValidIndex(index: number): boolean;
    /**
     * Sets focus on the HTML element for the label wrapper and scrolls it into the view if
     * scrolling is enabled.
     */
    _setTabFocus(tabIndex: number): void;
    /** The layout direction of the containing app. */
    _getLayoutDirection(): Direction;
    /** Performs the CSS transformation on the tab list that will cause the list to scroll. */
    _updateTabScrollPosition(): void;
    /** Sets the distance in pixels that the tab header should be transformed in the X-axis. */
    get scrollDistance(): number;
    set scrollDistance(value: number);
    /**
     * Moves the tab list in the 'before' or 'after' direction (towards the beginning of the list or
     * the end of the list, respectively). The distance to scroll is computed to be a third of the
     * length of the tab list view window.
     *
     * This is an expensive call that forces a layout reflow to compute box and scroll metrics and
     * should be called sparingly.
     */
    _scrollHeader(direction: ScrollDirection): {
        maxScrollDistance: number;
        distance: number;
    };
    /** Handles click events on the pagination arrows. */
    _handlePaginatorClick(direction: ScrollDirection): void;
    /**
     * Moves the tab list such that the desired tab label (marked by index) is moved into view.
     *
     * This is an expensive call that forces a layout reflow to compute box and scroll metrics and
     * should be called sparingly.
     */
    _scrollToLabel(labelIndex: number): void;
    /**
     * Evaluate whether the pagination controls should be displayed. If the scroll width of the
     * tab list is wider than the size of the header container, then the pagination controls should
     * be shown.
     *
     * This is an expensive call that forces a layout reflow to compute box and scroll metrics and
     * should be called sparingly.
     */
    _checkPaginationEnabled(): void;
    /**
     * Evaluate whether the before and after controls should be enabled or disabled.
     * If the header is at the beginning of the list (scroll distance is equal to 0) then disable the
     * before button. If the header is at the end of the list (scroll distance is equal to the
     * maximum distance we can scroll), then disable the after button.
     *
     * This is an expensive call that forces a layout reflow to compute box and scroll metrics and
     * should be called sparingly.
     */
    _checkScrollingControls(): void;
    /**
     * Determines what is the maximum length in pixels that can be set for the scroll distance. This
     * is equal to the difference in width between the tab list container and tab header container.
     *
     * This is an expensive call that forces a layout reflow to compute box and scroll metrics and
     * should be called sparingly.
     */
    _getMaxScrollDistance(): number;
    /** Stops the currently-running paginator interval.  */
    _stopInterval(): void;
    /**
     * Handles the user pressing down on one of the paginators.
     * Starts scrolling the header after a certain amount of time.
     * @param direction In which direction the paginator should be scrolled.
     */
    _handlePaginatorPress(direction: ScrollDirection, mouseEvent?: MouseEvent): void;
    /**
     * Scrolls the header to a given position.
     * @param position Position to which to scroll.
     * @returns Information on the current scroll distance and the maximum.
     */
    private _scrollTo;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<BrnTabsPaginatedList, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<BrnTabsPaginatedList, never, never, { "disablePagination": { "alias": "disablePagination"; "required": false; "isSignal": true; }; }, { "selectFocusedIndex": "selectFocusedIndex"; "indexFocused": "indexFocused"; }, never, never, true, never>;
}

declare const BrnTabsImports: readonly [typeof BrnTabs, typeof BrnTabsList, typeof BrnTabsTrigger, typeof BrnTabsContent, typeof BrnTabsContentLazy];

export { BrnTabs, BrnTabsContent, BrnTabsContentLazy, BrnTabsImports, BrnTabsList, BrnTabsPaginatedList, BrnTabsTrigger };
export type { BrnActivationMode, BrnPaginatedTabHeaderItem, BrnTabsDirection, BrnTabsOrientation, ScrollDirection, TabEntry };
