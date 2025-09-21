// Simple verification script to test removal functionality
const fs = require('fs');
const path = require('path');

async function verifyRemovalFunctionality() {
    console.log('Starting removal functionality verification...');
    
    // Create test files and folder structure
    const testDir = path.join(__dirname, 'test-removal');
    const testSubDir = path.join(testDir, 'subfolder');
    const testFile1 = path.join(testDir, 'test1.txt');
    const testFile2 = path.join(testSubDir, 'test2.txt');
    
    try {
        // Setup test structure
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        if (!fs.existsSync(testSubDir)) {
            fs.mkdirSync(testSubDir, { recursive: true });
        }
        
        fs.writeFileSync(testFile1, 'Test content 1');
        fs.writeFileSync(testFile2, 'Test content 2');
        
        console.log('✓ Test structure created');
        console.log('Test files created:');
        console.log('- Direct file:', testFile1);
        console.log('- Folder child:', testFile2);
        console.log('- Test folder:', testDir);
        
        console.log('✓ Test URIs prepared for Focus Space testing');
        console.log('Ready to test:');
        console.log('1. Add direct file to Focus Space');
        console.log('2. Add folder (which should eagerly load children) to Focus Space');
        console.log('3. Remove direct file - should work');
        console.log('4. Remove folder child - should now work with eager loading');
        console.log('5. Remove folder - should work');
        
        return {
            success: true,
            files: { testFile1, testFile2, testDir },
            cleanup: () => {
                // Cleanup function
                try {
                    if (fs.existsSync(testFile2)) fs.unlinkSync(testFile2);
                    if (fs.existsSync(testFile1)) fs.unlinkSync(testFile1);
                    if (fs.existsSync(testSubDir)) fs.rmdirSync(testSubDir);
                    if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
                    console.log('✓ Test cleanup completed');
                } catch (err) {
                    console.log('⚠ Cleanup error:', err.message);
                }
            }
        };
        
    } catch (error) {
        console.error('✗ Setup failed:', error.message);
        return { success: false, error };
    }
}

// Run if called directly
if (require.main === module) {
    verifyRemovalFunctionality().then(result => {
        if (result.success) {
            console.log('\n🎯 Verification setup complete');
            console.log('Now test the extension manually:');
            console.log('1. Open VS Code');
            console.log('2. Use the test files created');
            console.log('3. Add them to Focus Space');
            console.log('4. Try removing each type');
            
            // Auto-cleanup after 60 seconds
            setTimeout(() => {
                result.cleanup();
                console.log('Auto-cleanup completed after 60 seconds');
            }, 60000);
        } else {
            console.log('✗ Verification setup failed');
        }
    });
}

module.exports = { verifyRemovalFunctionality };