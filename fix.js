const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/clients/ClientDetailButton.tsx', 'utf8');
const fixed = content.replace(/className="btn-save"\s*>\s*Save\s*<\/button>[\s\S]*<\/Modal>/m, `className="btn-save"
              >
                Save
              </button>
              <button 
                onClick={() => {
                  setFormData({
                    companyName: client.companyName,
                    address: client.address || "",
                    city: client.city || "",
                    state: client.state || "",
                    zip: client.zip || "",
                    website: client.website || "",
                    phoneNumber: client.phoneNumber || "",
                    notes: client.notes || "",
                  });
                  setIsEditing(false);
                }}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>`);
fs.writeFileSync('src/app/(dashboard)/clients/ClientDetailButton.tsx', fixed);
