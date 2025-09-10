# Docker Deployment Options - Which One to Choose?

## 🎯 **Three Docker Deployment Options Explained**

### 1. **`docker-compose.yml` - SIMPLE DEPLOYMENT** 📦
**Use this for: Development, Testing, Small Projects**

```bash
docker-compose up -d
```

**What it includes:**
- ✅ SMTP Server only
- ✅ SQLite database (file-based)
- ✅ Basic logging
- ✅ Perfect for single applications

**Best for:**
- 🏠 **Local development**
- 🧪 **Testing the server**
- 📱 **Single application** using the SMTP server
- 🚀 **Quick start** and learning

---

### 2. **`docker-compose.full.yml` - PRODUCTION DEPLOYMENT** 🏭
**Use this for: Production, Multiple Apps, High Volume**

```bash
docker-compose -f docker-compose.full.yml up -d
```

**What it includes:**
- ✅ SMTP Server
- ✅ PostgreSQL database (robust)
- ✅ Redis (caching & queues)
- ✅ Nginx (reverse proxy)
- ✅ Advanced monitoring

**Best for:**
- 🌐 **Production deployments**
- 👥 **Multiple applications** using the server
- 📈 **High email volumes**
- 🔒 **Production security** requirements

---

### 3. **`docker-compose.override.yml` - DEVELOPMENT OVERRIDE** 🛠️
**This is NOT standalone! It modifies the simple deployment**

```bash
# This file automatically applies when you run:
docker-compose up -d
```

**What it does:**
- 🔧 **Overrides** environment variables in `docker-compose.yml`
- 🧪 **Pre-configured** with test credentials
- 🚫 **Cannot run by itself**

---

## 🎯 **Which One Should You Use?**

### **For Your Use Case (App on localhost → VPS SMTP Server):**

**Recommended: `docker-compose.yml` (Simple)**

```bash
# On your VPS server:
git clone https://github.com/kkagain/smtp-server-kkagain.git
cd smtp-server-kkagain/mcp-server-smtp

# Start the simple deployment
docker-compose up -d --build

# Check if it's running
docker-compose ps
curl http://localhost:3008/api/health
```

**Why Simple is Perfect for You:**
- ✅ **Lightweight** - minimal resources on your VPS
- ✅ **Easy to manage** - single container
- ✅ **Dynamic SMTP** - your app sends its own credentials
- ✅ **SQLite database** - no complex database setup needed
- ✅ **Quick deployment** - up and running in minutes

---

## 📋 **Deployment Decision Tree**

```
What are you doing?
│
├── 🧪 Just testing/learning?
│   └── Use: docker-compose.yml (Simple)
│
├── 🏠 Single app for personal use?
│   └── Use: docker-compose.yml (Simple)
│
├── 👥 Multiple apps or production?
│   └── Use: docker-compose.full.yml (Production)
│
└── 🛠️ Local development with test data?
    └── Use: docker-compose.yml (Simple + Override applies automatically)
```

---

## 🚀 **Step-by-Step: Simple Deployment (Recommended)**

### **1. On Your VPS:**

```bash
# Clone and navigate
git clone https://github.com/kkagain/smtp-server-kkagain.git
cd smtp-server-kkagain/mcp-server-smtp

# Create directories
mkdir -p config logs data

# Start the server (no SMTP env vars needed!)
docker-compose up -d --build

# Verify it's running
docker-compose logs -f
```

### **2. Test from Your Local App:**

```bash
# Your app sends its own SMTP credentials
curl -X POST http://your-vps-ip:3008/api/email/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-change-this" \
  -d '{
    "to": "test@example.com",
    "subject": "Test from My App",
    "body": "Success! Using dynamic SMTP.",
    "smtpConfig": {
      "host": "smtp.gmail.com",
      "port": 587,
      "secure": false,
      "user": "your-email@gmail.com",
      "pass": "your-gmail-app-password"
    }
  }'
```

---

## 🔧 **If You Need Production Later:**

```bash
# Switch to production deployment
docker-compose down
docker-compose -f docker-compose.full.yml up -d --build
```

---

## 📊 **Comparison Table:**

| Feature | Simple | Production | Override |
|---------|--------|------------|----------|
| **Containers** | 1 | 4+ | 1 (modified) |
| **Database** | SQLite | PostgreSQL | SQLite |
| **Caching** | None | Redis | None |
| **Reverse Proxy** | None | Nginx | None |
| **SSL/TLS** | Manual | Automated | Manual |
| **Monitoring** | Basic | Advanced | Basic |
| **Resource Usage** | Low | High | Low |
| **Setup Complexity** | Easy | Moderate | Easy |
| **Best For** | Development/Small | Production | Development |

---

## ✅ **TLDR: Use `docker-compose.yml` (Simple)**

For your use case where your app sends emails through the VPS SMTP server:

```bash
# On VPS - Simple deployment (RECOMMENDED)
docker-compose up -d --build
```

This gives you:
- 🚀 **Fast setup**
- 💾 **Low resource usage**
- 🔄 **Dynamic SMTP support**
- 📧 **Perfect for your localhost app → VPS server setup**

**You're all set to start sending emails from your app!** 🎉
