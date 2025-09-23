import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';
import { setupTestEnvironment, cleanupTestEnvironment } from './testSetup';

export function run(): Promise<void> {
    // Setup test environment before running tests
    setupTestEnvironment();

    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true
    });

    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((c, e) => {
        const pattern = '**/**.test.js';
        const testFiles = glob.sync(pattern, { cwd: testsRoot });

        // Add files to the test suite
        testFiles.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

        try {
            // Run the mocha test
            mocha.run((failures: number) => {
                // Cleanup after tests complete
                try {
                    cleanupTestEnvironment();
                } catch (cleanupError) {
                    console.warn('Test cleanup failed:', cleanupError);
                }
                
                if (failures > 0) {
                    e(new Error(`${failures} tests failed.`));
                } else {
                    c();
                }
            });
        } catch (err) {
            console.error(err);
            e(err);
        }
    });
}