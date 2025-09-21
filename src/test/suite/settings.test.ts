import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ConfigurationManager, configuration } from '../../utils/configurationManager';

suite('Configuration Settings Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('ConfigurationManager Singleton', () => {
        test('Should create singleton instance', () => {
            const instance1 = ConfigurationManager.getInstance();
            const instance2 = ConfigurationManager.getInstance();
            
            assert.strictEqual(instance1, instance2);
        });

        test('Should dispose properly', () => {
            const instance = ConfigurationManager.getInstance();
            instance.dispose();
            
            // Should create new instance after disposal
            const newInstance = ConfigurationManager.getInstance();
            assert.notStrictEqual(instance, newInstance);
        });
    });

    suite('Appearance Settings', () => {
        test('hideWhenEmpty should default to true', () => {
            assert.strictEqual(configuration.hideWhenEmpty, true);
        });

        test('showItemCount should default to true', () => {
            assert.strictEqual(configuration.showItemCount, true);
        });

        test('showFileIcons should default to true', () => {
            assert.strictEqual(configuration.showFileIcons, true);
        });

        test('sortOrder should default to manual', () => {
            assert.strictEqual(configuration.sortOrder, 'manual');
        });

        test('sortOrder should accept valid enum values', () => {
            const validValues = ['manual', 'name', 'dateAdded', 'fileType'];
            
            // Mock the configuration to test enum validation
            const mockConfig = sandbox.stub(vscode.workspace, 'getConfiguration');
            validValues.forEach(value => {
                mockConfig.returns({
                    get: sandbox.stub().withArgs('sortOrder', 'manual').returns(value)
                } as any);
                
                const manager = new (ConfigurationManager as any)();
                assert.strictEqual(manager.sortOrder, value);
                mockConfig.reset();
            });
        });
    });

    suite('Behavior Settings', () => {
        test('revealBehavior should default to smart', () => {
            assert.strictEqual(configuration.revealBehavior, 'smart');
        });

        test('enableDragAndDrop should default to true', () => {
            assert.strictEqual(configuration.enableDragAndDrop, true);
        });

        test('allowExternalDrop should default to true', () => {
            assert.strictEqual(configuration.allowExternalDrop, true);
        });

        test('autoRevealActiveFile should default to true', () => {
            assert.strictEqual(configuration.autoRevealActiveFile, true);
        });

        test('removeDeletedFiles should default to true', () => {
            assert.strictEqual(configuration.removeDeletedFiles, true);
        });

        test('updateMovedFiles should default to true', () => {
            assert.strictEqual(configuration.updateMovedFiles, true);
        });

        test('excludePatterns should have sensible defaults', () => {
            const patterns = configuration.excludePatterns;
            assert.ok(Array.isArray(patterns));
            assert.ok(patterns.includes('**/node_modules/**'));
            assert.ok(patterns.includes('**/.git/**'));
            assert.ok(patterns.includes('**/dist/**'));
        });

        test('doubleClickBehavior should default to open', () => {
            assert.strictEqual(configuration.doubleClickBehavior, 'open');
        });
    });

    suite('Performance Settings', () => {
        test('enableFileWatcher should default to true', () => {
            assert.strictEqual(configuration.enableFileWatcher, true);
        });

        test('maxFileSize should default to 10', () => {
            assert.strictEqual(configuration.maxFileSize, 10);
        });

        test('maxItemCount should default to 1000', () => {
            assert.strictEqual(configuration.maxItemCount, 1000);
        });

        test('watcherDebounceMs should be clamped to valid range', () => {
            const manager = new (ConfigurationManager as any)();
            
            // Mock extreme values
            const mockConfig = sandbox.stub(vscode.workspace, 'getConfiguration');
            
            // Test lower bound
            mockConfig.returns({
                get: sandbox.stub().withArgs('watcherDebounceMs', 100).returns(10)
            } as any);
            assert.strictEqual(manager.watcherDebounceMs, 50); // Should clamp to minimum
            
            // Test upper bound
            mockConfig.returns({
                get: sandbox.stub().withArgs('watcherDebounceMs', 100).returns(10000)
            } as any);
            assert.strictEqual(manager.watcherDebounceMs, 5000); // Should clamp to maximum
        });

        test('persistenceDebounceMs should be clamped to valid range', () => {
            const manager = new (ConfigurationManager as any)();
            
            // Mock extreme values
            const mockConfig = sandbox.stub(vscode.workspace, 'getConfiguration');
            
            // Test lower bound
            mockConfig.returns({
                get: sandbox.stub().withArgs('persistenceDebounceMs', 500).returns(50)
            } as any);
            assert.strictEqual(manager.persistenceDebounceMs, 100); // Should clamp to minimum
        });
    });

    suite('Workflow Settings', () => {
        test('showInExplorerContext should default to true', () => {
            assert.strictEqual(configuration.showInExplorerContext, true);
        });

        test('showInEditorTitle should default to true', () => {
            assert.strictEqual(configuration.showInEditorTitle, true);
        });

        test('workspaceSpecificSettings should default to true', () => {
            assert.strictEqual(configuration.workspaceSpecificSettings, true);
        });

        test('autoSaveEnabled should default to true', () => {
            assert.strictEqual(configuration.autoSaveEnabled, true);
        });
    });

    suite('Exclude Pattern Matching', () => {
        test('Should correctly identify excluded files', () => {
            // Test with default patterns
            assert.strictEqual(configuration.isExcluded('/project/node_modules/package/file.js'), true);
            assert.strictEqual(configuration.isExcluded('/project/.git/config'), true);
            assert.strictEqual(configuration.isExcluded('/project/dist/bundle.js'), true);
            assert.strictEqual(configuration.isExcluded('/project/build/output.js'), true);
            assert.strictEqual(configuration.isExcluded('/project/temp.tmp'), true);
            assert.strictEqual(configuration.isExcluded('/project/debug.log'), true);
        });

        test('Should correctly identify non-excluded files', () => {
            assert.strictEqual(configuration.isExcluded('/project/src/index.ts'), false);
            assert.strictEqual(configuration.isExcluded('/project/README.md'), false);
            assert.strictEqual(configuration.isExcluded('/project/package.json'), false);
        });

        test('Should handle invalid patterns gracefully', () => {
            const mockConfig = sandbox.stub(vscode.workspace, 'getConfiguration');
            mockConfig.returns({
                get: sandbox.stub().withArgs('excludePatterns', sinon.match.any).returns(['[invalid'])
            } as any);
            
            const manager = new (ConfigurationManager as any)();
            
            // Should not throw and should return false for invalid patterns
            assert.strictEqual(manager.isExcluded('/some/file.js'), false);
        });
    });

    suite('Configuration Validation', () => {
        test('Should validate numeric ranges', () => {
            const issues = configuration.validateConfiguration();
            
            // Should have no issues with default configuration
            assert.strictEqual(issues.length, 0);
        });

        test('Should detect invalid maxFileSize', () => {
            const mockConfig = sandbox.stub(vscode.workspace, 'getConfiguration');
            mockConfig.returns({
                get: sandbox.stub()
                    .withArgs('maxFileSize', 10).returns(200) // Invalid: too high
                    .withArgs('maxItemCount', 1000).returns(1000)
                    .withArgs('watcherDebounceMs', 100).returns(100)
                    .withArgs('persistenceDebounceMs', 500).returns(500)
                    .withArgs('excludePatterns', sinon.match.any).returns([])
            } as any);
            
            const manager = new (ConfigurationManager as any)();
            const issues = manager.validateConfiguration();
            
            assert.ok(issues.some((issue: string) => issue.includes('maxFileSize')));
        });

        test('Should detect invalid patterns', () => {
            const mockConfig = sandbox.stub(vscode.workspace, 'getConfiguration');
            mockConfig.returns({
                get: sandbox.stub()
                    .withArgs('excludePatterns', sinon.match.any).returns(['[invalid'])
                    .withArgs('maxFileSize', 10).returns(10)
                    .withArgs('maxItemCount', 1000).returns(1000)
                    .withArgs('watcherDebounceMs', 100).returns(100)
                    .withArgs('persistenceDebounceMs', 500).returns(500)
            } as any);
            
            const manager = new (ConfigurationManager as any)();
            const issues = manager.validateConfiguration();
            
            assert.ok(issues.some((issue: string) => issue.includes('Invalid exclude pattern')));
        });
    });

    suite('Configuration Management', () => {
        test('Should get all settings as structured object', () => {
            const settings = configuration.getAllSettings();
            
            assert.ok(typeof settings === 'object');
            assert.ok('hideWhenEmpty' in settings);
            assert.ok('revealBehavior' in settings);
            assert.ok('maxFileSize' in settings);
            assert.ok('excludePatterns' in settings);
        });

        test('Should support setting values', async () => {
            const mockConfig = {
                get: sandbox.stub(),
                update: sandbox.stub().resolves(),
                inspect: sandbox.stub()
            };
            
            const mockGetConfiguration = sandbox.stub(vscode.workspace, 'getConfiguration');
            mockGetConfiguration.returns(mockConfig as any);
            
            await configuration.set('hideWhenEmpty', false);
            
            assert.ok(mockConfig.update.calledWith('hideWhenEmpty', false));
        });

        test('Should support inspect functionality', () => {
            const mockInspectResult = {
                key: 'hideWhenEmpty',
                defaultValue: true,
                globalValue: undefined,
                workspaceValue: false
            };
            
            const mockConfig = {
                get: sandbox.stub(),
                update: sandbox.stub(),
                inspect: sandbox.stub().returns(mockInspectResult)
            };
            
            const mockGetConfiguration = sandbox.stub(vscode.workspace, 'getConfiguration');
            mockGetConfiguration.returns(mockConfig as any);
            
            const result = configuration.inspect('hideWhenEmpty');
            
            assert.ok(mockConfig.inspect.calledWith('hideWhenEmpty'));
            assert.deepStrictEqual(result, mockInspectResult);
        });
    });

    suite('Configuration Change Events', () => {
        test('Should handle configuration changes', () => {
            // This is more of a structural test since we can't easily mock events
            const manager = ConfigurationManager.getInstance();
            
            // Should not throw when configuration changes
            assert.doesNotThrow(() => {
                const event = {
                    affectsConfiguration: (section: string) => section === 'focusSpace'
                } as vscode.ConfigurationChangeEvent;
                
                // Call the private method if possible, otherwise just verify no errors
                (manager as any).onConfigurationChanged?.(event);
            });
        });
    });
});