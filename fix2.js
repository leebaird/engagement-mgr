const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/contacts/ContactDetailButton.tsx', 'utf8');
const fixed = content.replace(/className="btn-cancel"\s*>\s*Cancel\s*\{\s*error\s*&&\s*\(/, `className="btn-cancel" 
                >
                  Cancel
                </button>
              </div>
            
            {error && (`);
fs.writeFileSync('src/app/(dashboard)/contacts/ContactDetailButton.tsx', fixed);
