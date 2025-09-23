import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ConfigurationMigrator } from '../../utils/configurationMigrator';

suite('Configuration Migration Tests', () => {
    let sandbox: sinon.SinonSandbox;
    let mockContext: vscode.ExtensionContext;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Mock extension context
        mockContext = {
            globalState: {
                get: sandbox.stub(),
                update: sandbox.stub().resolves()
            }
        } as any;
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('Migration Version Detection', () => {
        test('Should detect when migration is needed', async () => {
            // Mock old version
            (mockContext.globalState.get as sinon.SinonStub)
                .withArgs('focusSpace.migrationVersion', '0.0.0')
                .returns('0.5.0');

            const getConfigStub = sandbox.stub(vscode.workspace, 'getConfiguration');
            const mockConfig = {
                get: sandbox.stub(),
                update: sandbox.stub().resolves()
            };
            getConfigStub.returns(mockConfig as any);

            // Should run migration
            await ConfigurationMigrator.runMigrations(mockContext);
            
            // Should update migration version
            assert.ok((mockContext.globalState.update as sinon.SinonStub)
                .calledWith('focusSpace.migrationVersion', '1.0.0'));
        });

        test('Should skip migration when not needed', async () => {
            // Mock current version
            (mockContext.globalState.get as sinon.SinonStub)
                .withArgs('focusSpace.migrationVersion', '0.0.0')
                .returns('1.0.0');

            const getConfigStub = sandbox.stub(vscode.workspace, 'getConfiguration');
            
            // Should not call getConfiguration if no migration needed
            await ConfigurationMigrator.runMigrations(mockContext);
            
            assert.ok(getConfigStub.notCalled);
        });
    });

    suite('V1.0.0 Migration', () => {
        test('Should convert string hideWhenEmpty to boolean', async () => {
            (mockContext.globalState.get as sinon.SinonStub)
                .withArgs('focusSpace.migrationVersion', '0.0.0')
                .returns('0.0.0');

            const mockConfig = {
                get: sandbox.stub(),
                update: sandbox.stub().resolves()
            };

            // Mock string value for hideWhenEmpty
            mockConfig.get.withArgs('hideWhenEmpty').returns('true');
            mockConfig.get.withArgs('excludePatterns').returns([]);
            mockConfig.get.withArgs('revealBehavior').returns('smart');

            const getConfigStub = sandbox.stub(vscode.workspace, 'getConfiguration');
            getConfigStub.returns(mockConfig as any);

            await ConfigurationMigrator.runMigrations(mockContext);

            // Should update hideWhenEmpty to boolean
            assert.ok(mockConfig.update.calledWith('hideWhenEmpty', true, vscode.ConfigurationTarget.Global));
        });

        test('Should add default exclude patterns if missing', async () => {
            (mockContext.globalState.get as sinon.SinonStub)
                .withArgs('focusSpace.migrationVersion', '0.0.0')
                .returns('0.0.0');

            const mockConfig = {
                get: sandbox.stub(),
                update: sandbox.stub().resolves()
            };

            // Mock missing exclude patterns
            mockConfig.get.withArgs('hideWhenEmpty').returns(true);
            mockConfig.get.withArgs('excludePatterns').returns(undefined);
            mockConfig.get.withArgs('revealBehavior').returns('smart');

            const getConfigStub = sandbox.stub(vscode.workspace, 'getConfiguration');
            getConfigStub.returns(mockConfig as any);

            await ConfigurationMigrator.runMigrations(mockContext);

            // Should add default exclude patterns
            const expectedPatterns = [
                '**/node_modules/**',
                '**/.git/**',
                '**/dist/**',
                '**/build/**',
                '**/*.tmp',
                '**/*.log'
            ];
            
            assert.ok(mockConfig.update.calledWith('excludePatterns', expectedPatterns, vscode.ConfigurationTarget.Global));
        });

        test('Should fix invalid reveal behavior', async () => {
            (mockContext.globalState.get as sinon.SinonStub)
                .withArgs('focusSpace.migrationVersion', '0.0.0')
                .returns('0.0.0');

            const mockConfig = {
                get: sandbox.stub(),
                update: sandbox.stub().resolves()
            };

            // Mock invalid reveal behavior
            mockConfig.get.withArgs('hideWhenEmpty').returns(true);
            mockConfig.get.withArgs('excludePatterns').returns([]);
            mockConfig.get.withArgs('revealBehavior').returns('invalid-value');

            const getConfigStub = sandbox.stub(vscode.workspace, 'getConfiguration');
            getConfigStub.returns(mockConfig as any);

            await ConfigurationMigrator.runMigrations(mockContext);

            // Should reset to default
            assert.ok(mockConfig.update.calledWith('revealBehavior', 'smart', vscode.ConfigurationTarget.Global));
        });
    });

    suite('Configuration Validation and Repair', () => {
        test('Should validate and fix invalid settings', async () => {
            // Import and mock the configuration manager
            const { ConfigurationManager } = await import('../../utils/configurationManager');
            
            // Mock the validateConfiguration method
            const validateStub = sandbox.stub(ConfigurationManager.prototype, 'validateConfiguration');
            validateStub.returns(['maxFileSize must be between 1 and 100 MB, got 200']);
            
            // Mock the set method
            const setStub = sandbox.stub(ConfigurationManager.prototype, 'set');
            setStub.resolves();

            const fixedIssues = await ConfigurationMigrator.validateAndFixConfiguration();

            // Should have fixed the issue
            assert.ok(fixedIssues.length > 0);
            assert.ok(setStub.calledWith('maxFileSize', 10));
        });

        test('Should reset configuration to defaults', async () => {
            // Import and mock the configuration manager
            const { ConfigurationManager } = await import('../../utils/configurationManager');
            
            // Mock the resetToDefaults method 
            const resetStub = sandbox.stub(ConfigurationManager.prototype, 'resetToDefaults');
            resetStub.resolves();

            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage');

            await ConfigurationMigrator.resetToDefaults();

            assert.ok(resetStub.called);
            assert.ok(showInfoStub.calledWith('Focus Space: All settings have been reset to defaults.'));
        });
    });

    suite('Configuration Export/Import', () => {
        test('Should export configuration with version and timestamp', () => {
            // Import and mock the configuration manager
            const { ConfigurationManager } = require('../../utils/configurationManager');
            
            const mockSettings = {
                hideWhenEmpty: true,
                revealBehavior: 'smart',
                maxFileSize: 10
            };

            // Mock the getAllSettings method
            const getAllStub = sandbox.stub(ConfigurationManager.prototype, 'getAllSettings');
            getAllStub.returns(mockSettings);

            const exported = ConfigurationMigrator.exportConfiguration();

            assert.ok(exported.version);
            assert.ok(exported.timestamp);
            assert.deepStrictEqual(exported.settings, mockSettings);
        });

        test('Should import configuration successfully', async () => {
            const configData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                settings: {
                    hideWhenEmpty: false,
                    maxFileSize: 20
                }
            };

            const mockConfig = {
                update: sandbox.stub().resolves()
            };

            const getConfigStub = sandbox.stub(vscode.workspace, 'getConfiguration');
            getConfigStub.returns(mockConfig as any);

            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage');

            await ConfigurationMigrator.importConfiguration(configData);

            assert.ok(mockConfig.update.calledWith('hideWhenEmpty', false, vscode.ConfigurationTarget.Workspace));
            assert.ok(mockConfig.update.calledWith('maxFileSize', 20, vscode.ConfigurationTarget.Workspace));
            assert.ok(showInfoStub.calledWith('Focus Space: Configuration imported successfully.'));
        });

        test('Should handle invalid import data', async () => {
            const invalidData = { version: '1.0.0' }; // Missing settings

            try {
                await ConfigurationMigrator.importConfiguration(invalidData);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok((error as Error).message.includes('Invalid configuration data'));
            }
        });
    });
});