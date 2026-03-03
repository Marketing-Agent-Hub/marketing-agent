# News Aggregator Configuration Guide

This system has been generalized to work as a universal news aggregator, not tied to any specific organization.

## 🌍 Multi-Language & Multi-Organization Support

The system now supports **any organization** and **any language** through environment variables.

---

## 📝 Environment Variables

Update your `.env` file with these new configuration options:

### **Application Branding**

```env
# Your organization/project name
APP_NAME="News Aggregator"

# Brief description of your application
APP_DESCRIPTION="AI-powered news aggregation system"

# User-Agent for HTTP requests (be respectful to source servers)
USER_AGENT="NewsAggregatorBot/1.0"
```

### **Content Configuration**

```env
# Language for content output (ISO 639-1 codes)
# Supported: en (English), vi (Vietnamese), es (Spanish)
# You can add more languages in ai-stage-b.service.ts
CONTENT_LANGUAGE="en"

# Target audience description
TARGET_AUDIENCE="general audience"

# Focus topics (comma-separated, used for AI filtering and hashtags)
FOCUS_TOPICS="technology,business,science,education"
```

### **Database**

```env
# Update database name as needed
DATABASE_URL="postgresql://username:password@localhost:5432/news_aggregator?schema=public"
```

---

## 🎯 Examples for Different Use Cases

### **Technology News Aggregator (English)**

```env
APP_NAME="Tech News Hub"
APP_DESCRIPTION="Curated technology news and insights"
USER_AGENT="TechNewsHubBot/1.0"
CONTENT_LANGUAGE="en"
TARGET_AUDIENCE="developers, tech enthusiasts, and industry professionals"
FOCUS_TOPICS="technology,software,ai,cloud,cybersecurity"
```

### **Educational Content (Vietnamese)**

```env
APP_NAME="Open Campus Vietnam"
APP_DESCRIPTION="Educational blockchain community"
USER_AGENT="OpenCampusVietnamBot/1.0"
CONTENT_LANGUAGE="vi"
TARGET_AUDIENCE="builders, educators, students interested in Web3 education"
FOCUS_TOPICS="education,edtech,blockchain,web3,defi"
```

### **Business News (Spanish)**

```env
APP_NAME="Noticias Empresariales"
APP_DESCRIPTION="Agregador de noticias de negocios"
USER_AGENT="NoticiasEmpresarialesBot/1.0"
CONTENT_LANGUAGE="es"
TARGET_AUDIENCE="profesionales de negocios y emprendedores"
FOCUS_TOPICS="negocios,economia,finanzas,startups"
```

### **Science & Research**

```env
APP_NAME="Science Chronicle"
APP_DESCRIPTION="Latest scientific research and discoveries"
USER_AGENT="ScienceChronicleBot/1.0"
CONTENT_LANGUAGE="en"
TARGET_AUDIENCE="researchers, students, and science enthusiasts"
FOCUS_TOPICS="science,research,medicine,space,environment"
```

---

## 🌐 Adding Support for New Languages

To add a new language, update `src/services/ai-stage-b.service.ts`:

```typescript
function getLanguageInstructions(lang: string) {
    const instructions: Record<string, any> = {
        // ... existing languages
        fr: {  // French example
            summaryLabel: '2-3 phrases résumant le contenu principal',
            bulletsLabel: 'Points clés (en français, garder les termes techniques en anglais)',
            whyItMattersLabel: '1-2 phrases expliquant pourquoi c\'est important',
            riskFlagsLabel: 'Avertissements si nécessaire, tableau vide sinon',
            languageName: 'French',
        },
    };
    return instructions[lang] || instructions.en;
}
```

---

## 🔧 How It Works

### **Stage A (Content Filtering)**
- Uses `FOCUS_TOPICS` to inform AI what kind of content to prioritize
- Automatically generates topic tags based on your focus areas
- Configurable importance scoring

### **Stage B (Content Processing)**
- Generates summaries in your chosen `CONTENT_LANGUAGE`
- Tailors content for your `TARGET_AUDIENCE`
- Suggests hashtags based on `FOCUS_TOPICS`
- Adapts tone and style to match your organization

### **User-Agent Handling**
- All HTTP requests use your configured `USER_AGENT`
- Helps identify your bot to source servers
- Follows web scraping best practices

---

## 📊 Database Naming

The system expects a PostgreSQL database. The default name in `.env.example` is:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/news_aggregator?schema=public"
```

You can name it anything you like. Just update the connection string.

---

## ✅ Migration Checklist

If you're migrating from the old Open Campus-specific version:

- [x] Update environment variables in `.env`
- [ ] Update database name if needed
- [ ] Review and customize `FOCUS_TOPICS` for your use case
- [ ] Set appropriate `CONTENT_LANGUAGE`
- [ ] Define your `TARGET_AUDIENCE`
- [ ] Update `APP_NAME` and `APP_DESCRIPTION`
- [ ] Set a respectful `USER_AGENT`
- [ ] Test AI outputs with new configuration
- [ ] Update any custom RSS sources in the database

---

## 🚀 Quick Start

1. Copy `.env.example` to `.env`
2. Configure all variables for your organization
3. Run migrations: `npm run prisma:migrate`
4. Start server: `npm run dev`
5. Add RSS sources via API or database
6. Monitor AI processing and adjust prompts if needed

---

## 🤝 Support

The AI prompts are designed to be flexible and adapt to your configuration. If you need to fine-tune the prompts further, edit:

- `src/services/ai-stage-a.service.ts` - Content filtering
- `src/services/ai-stage-b.service.ts` - Content summarization

Both files now use environment variables extensively, making customization easier without code changes.
