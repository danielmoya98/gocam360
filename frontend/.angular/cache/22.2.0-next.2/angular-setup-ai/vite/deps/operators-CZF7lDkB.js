import { l as __spreadArray, s as __read } from "./tslib.es6-COL127aV.js";
import { $t as not, Qt as filter, R as raceWith, tn as argsOrArgArray } from "./zipWith-BIPy9JuQ.js";
//#region node_modules/rxjs/dist/esm5/internal/operators/partition.js
function partition(predicate, thisArg) {
	return function(source) {
		return [filter(predicate, thisArg)(source), filter(not(predicate, thisArg))(source)];
	};
}
//#endregion
//#region node_modules/rxjs/dist/esm5/internal/operators/race.js
function race() {
	var args = [];
	for (var _i = 0; _i < arguments.length; _i++) args[_i] = arguments[_i];
	return raceWith.apply(void 0, __spreadArray([], __read(argsOrArgArray(args))));
}
//#endregion
export { partition as n, race as t };
