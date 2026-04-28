# Unidex ERP

**High-Performance Retail PWA & Inventory Management System**  
*Built for small and medium retail shops in Tier 2-3 Indian cities*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Status](https://img.shields.io/badge/Status-Early%20Development-orange)

---

## 📖 Overview

Unidex ERP is a modern, full-stack Progressive Web App (PWA) designed to help small retail shops (kirana stores, general stores, etc.) manage their daily operations efficiently.

It provides **Quick Billing**, **Inventory Management**, **Customer & Vendor Tracking**, **Purchase Management**, and **GST-compliant Invoicing** — all in one lightweight, mobile-first application.

**Target Users**: Small shop owners in Tier 2-3 cities who need a simple, fast, and affordable alternative to complex ERPs like Tally or Marg.

---

## ✨ Key Features

- **Quick Bill** — Fast counter billing with barcode scanning (camera + manual entry)
- **Inventory Management** — Real-time stock tracking with low-stock alerts
- **Sales & Invoicing** — GST-compliant invoices with multiple payment modes
- **Customer & Vendor Management** — Complete party ledger with credit tracking
- **Purchase Management** — Record purchases, track payments & dues
- **Reports & Analytics** — Sales, Purchase, Profit & Loss reports (coming soon)
- **Progressive Web App** — Installable on Android, works offline, fast loading
- **Dark Theme** — Modern, eye-friendly interface optimized for mobile

---

## 🛠 Tech Stack

**Frontend**
- HTML5 + CSS3 + Vanilla JavaScript (PWA)
- Responsive design with mobile-first approach
- Service Worker + Manifest for offline support

**Backend**
- Node.js + Express.js
- MySQL (with transaction support)
- Python (for PDF generation & utilities)

**Key Libraries**
- Helmet, CORS, Express Rate Limit (Security)
- HTML5-QRCode (Barcode scanning)
- QRious (QR Code generation)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL Server
- Python 3.10+

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/scb26/erp.git
cd erp

# 2. Install frontend dependencies
npm install

# 3. Setup Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your MySQL credentials

# 4. Run Database Migrations
npm run migrate

# 5. Start the Application
npm run dev
```

The app will be available at:

Frontend: http://localhost:5500
Backend: http://localhost:4000

## 📁 Project Structure

```text
erp/
├── index.html              # Main PWA entry point
├── js/                     # Frontend JavaScript
│   ├── modules/            # All feature modules (Inventory, Sales, etc.)
│   ├── state-store.js      # Centralized state + backend sync
│   ├── erp.js              # Application bootstrap
│   └── ...
├── backend/                # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/
│   │   └── middlewares/
│   └── ...
├── db/                     # SQL migrations & seeds
├── pwa/                    # PWA assets (manifest, icons, sw.js)
├── assets/                 # Images, fonts, etc.
└── package.json

```
## 🗺 Development Roadmap

### Completed ✅
- Modular PWA Architecture
- Backend with MySQL + Transaction Support
- Quick Bill with Barcode Scanning (Camera + Manual)
- Inventory, Customers, Vendors & Purchase Management

### In Progress 🚧
- JWT Authentication & Role-based Access
- Advanced Reports & Analytics Dashboard

### Upcoming Features 🔜
- Party Ledger + Credit Management System
- Mobile Apps (Android + iOS) using Flutter
- Multi-language Support (Hindi + English)
- Cloud Sync & Multi-device Support
- Offline Mode Enhancements


## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Shekhar**

- GitHub: [@scb26](https://github.com/scb26)
- LinkedIn: https://www.linkedin.com/in/shekharborulkar
  

*Built with ❤️ for the hardworking shopkeepers of India.*


⭐ If you find this project useful, please consider giving it a star!
