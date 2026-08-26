"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initGenerator = initGenerator;
exports.initGeneratorInternal = initGeneratorInternal;
const internal_1 = require("@nx/devkit/internal");
const devkit_1 = require("@nx/devkit");
const path_1 = require("path");
const plugin_1 = require("../../plugins/typescript/plugin");
const assert_supported_typescript_version_1 = require("../../utils/assert-supported-typescript-version");
const prettier_1 = require("../../utils/prettier");
const create_ts_config_1 = require("../../utils/typescript/create-ts-config");
const ts_config_1 = require("../../utils/typescript/ts-config");
const ts_solution_setup_1 = require("../../utils/typescript/ts-solution-setup");
const versions_1 = require("../../utils/versions");
async function initGenerator(tree, schema) {
    schema.addTsPlugin ??= false;
    const isUsingNewTsSetup = schema.addTsPlugin || (0, ts_solution_setup_1.isUsingTsSolutionSetup)(tree);
    schema.formatter ??= isUsingNewTsSetup ? 'none' : 'prettier';
    return initGeneratorInternal(tree, {
        addTsConfigBase: true,
        ...schema,
    });
}
async function initGeneratorInternal(tree, schema) {
    (0, assert_supported_typescript_version_1.assertSupportedTypescriptVersion)(tree);
    const tasks = [];
    const nxJson = (0, devkit_1.readNxJson)(tree);
    schema.addPlugin ??=
        process.env.NX_ADD_PLUGINS !== 'false' &&
            nxJson.useInferencePlugins !== false;
    schema.addTsPlugin ??= schema.addPlugin;
    if (schema.addTsPlugin) {
        await (0, internal_1.addPlugin)(tree, await (0, devkit_1.createProjectGraphAsync)(), '@nx/js/typescript', plugin_1.createNodesV2, {
            typecheck: [
                { targetName: 'typecheck' },
                { targetName: 'tsc:typecheck' },
                { targetName: 'tsc-typecheck' },
            ],
            build: [
                {
                    targetName: 'build',
                    configName: 'tsconfig.lib.json',
                    buildDepsName: 'build-deps',
                    watchDepsName: 'watch-deps',
                },
                {
                    targetName: 'tsc:build',
                    configName: 'tsconfig.lib.json',
                    buildDepsName: 'tsc:build-deps',
                    watchDepsName: 'tsc:watch-deps',
                },
                {
                    targetName: 'tsc-build',
                    configName: 'tsconfig.lib.json',
                    buildDepsName: 'tsc-build-deps',
                    watchDepsName: 'tsc-watch-deps',
                },
            ],
        }, schema.updatePackageScripts);
    }
    if (schema.addTsConfigBase && !(0, ts_config_1.getRootTsConfigFileName)(tree)) {
        if (schema.addTsPlugin) {
            const platform = schema.platform ?? 'node';
            const customCondition = (0, ts_solution_setup_1.getCustomConditionName)(tree);
            (0, devkit_1.generateFiles)(tree, (0, path_1.join)(__dirname, './files/ts-solution'), '.', {
                platform,
                customCondition,
                tmpl: '',
            });
        }
        else {
            (0, devkit_1.generateFiles)(tree, (0, path_1.join)(__dirname, './files/non-ts-solution'), '.', {
                fileName: schema.tsConfigName ?? 'tsconfig.base.json',
                moduleResolution: (0, create_ts_config_1.getTsConfigBaseOptions)(tree).moduleResolution,
            });
        }
    }
    const devDependencies = {
        '@nx/js': versions_1.nxVersion,
        // Required by SWC-compiled output (decorators -> @swc/helpers/_/_ts_decorate
        // imports). The default @nx/jest setup transforms with @swc/jest, so any
        // workspace using decorators (NestJS, Angular, etc.) needs @swc/helpers
        // resolvable at test time. Cheap to ship and avoids per-generator install.
        '@swc/helpers': versions_1.swcHelpersVersion,
    };
    // @swc-node/register and @swc/core are no longer installed by init - native
    // Node.js type stripping handles .ts config loading on Node 23+ (or 22.6+
    // with --experimental-strip-types). loadTsFile registers swc/ts-node lazily
    // when a config uses syntax native strip can't handle.
    if (!schema.js) {
        devDependencies['typescript'] = versions_1.typescriptVersion;
    }
    if (schema.formatter === 'prettier') {
        const prettierTask = (0, prettier_1.generatePrettierSetup)(tree, {
            skipPackageJson: schema.skipPackageJson,
        });
        tasks.push(prettierTask);
    }
    const rootTsConfigFileName = (0, ts_config_1.getRootTsConfigFileName)(tree);
    // If the root tsconfig file uses `importHelpers` then we must install tslib
    // in order to run tsc for build and typecheck.
    if (rootTsConfigFileName) {
        const rootTsConfig = (0, devkit_1.readJson)(tree, rootTsConfigFileName);
        if (rootTsConfig.compilerOptions?.importHelpers) {
            devDependencies['tslib'] = versions_1.tsLibVersion;
        }
    }
    const installTask = !schema.skipPackageJson
        ? (0, devkit_1.addDependenciesToPackageJson)(tree, {}, devDependencies, undefined, schema.keepExistingVersions ?? true)
        : () => { };
    tasks.push(installTask);
    if (!schema.skipPackageJson &&
        // For `create-nx-workspace` or `nx g @nx/js:init`, we want to make sure users didn't set formatter to none.
        // For programmatic usage, the formatter is normally undefined, and we want prettier to continue to be ensured, even if not ultimately installed.
        schema.formatter !== 'none') {
        (0, devkit_1.ensurePackage)('prettier', versions_1.prettierVersion);
    }
    if (!schema.skipFormat) {
        // even if skipPackageJson === true, we can safely run formatFiles, prettier might
        // have been installed earlier and if not, the formatFiles function still handles it
        await (0, devkit_1.formatFiles)(tree);
    }
    return (0, devkit_1.runTasksInSerial)(...tasks);
}
exports.default = initGenerator;
