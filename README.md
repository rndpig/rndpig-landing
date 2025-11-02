# RND Portfolio Landing Page

A clean, minimalist landing page serving as the frontend hub for navigating to various applications and projects.

## 🎯 Overview

This is a simple, responsive portfolio landing page designed to provide easy navigation to different projects and applications. Currently features the Dept56 Gallery with space for future projects.

## 🚀 Features

- **Minimalist Design**: Clean, simple aesthetic focusing on content and navigation
- **Responsive Layout**: Mobile-first design that works on all devices
- **Fast Loading**: Lightweight with minimal dependencies
- **SEO Optimized**: Proper meta tags and semantic HTML structure
- **GitHub Pages Ready**: Configured for easy deployment to GitHub Pages

## � Project Structure

```
rndpig-landing/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # Minimalist stylesheet
├── js/
│   └── script.js       # Basic JavaScript functionality
├── favicon.svg         # RND logo favicon
├── package.json        # Project configuration
└── README.md          # This file
```

## 🎨 Design System

### Colors
- **Primary Blue**: `#2563eb` (brand color)
- **Text**: `#333` (dark), `#666` (medium), `#999` (light)
- **Background**: `#fff` (primary), `#fafafa` (secondary)
- **Borders**: `#eee`

### Typography
- **Font Family**: Inter (with system font fallbacks)
- **Font Weights**: 300 (light), 400 (regular), 500 (medium), 600 (semibold)

## 📱 Current Projects

### Dept56 Gallery
A curated collection showcasing various items and artifacts.
- **Status**: Active
- **Link**: Currently placeholder (to be updated with actual URL)

### Future Projects
Additional projects will be added as they are developed.

## 🛠️ Local Development

### Prerequisites
- A modern web browser
- Optional: Python or Node.js for local server

### Quick Start
1. Clone or download the repository
2. Open `index.html` in your browser, or
3. Run a local server:

**Using Python:**
```bash
cd rndpig-landing
python -m http.server 8000
```

**Using Node.js:**
```bash
cd rndpig-landing
npx http-server -p 8000 -c-1
```

Then visit `http://localhost:8000`

## 🌐 Deployment to GitHub Pages

### Step 1: Create GitHub Repository
1. Go to [GitHub](https://github.com) and create a new **private** repository
2. Name it `rndpig-landing` (or your preferred name)
3. Don't initialize with README (we already have one)

### Step 2: Push Code to GitHub
```bash
cd "C:\Users\rndpi\Documents\Coding Projects\rndpig-landing"
git init
git add .
git commit -m "Initial commit: Minimalist portfolio landing page"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rndpig-landing.git
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll to **Pages** section
4. Under **Source**, select **Deploy from a branch**
5. Choose **main** branch and **/ (root)** folder
6. Click **Save**
7. Your site will be available at: `https://YOUR_USERNAME.github.io/rndpig-landing/`

## 🔗 Configure GoDaddy Domain (rndpig.com)

### Step 1: Add Custom Domain to GitHub Pages
1. In your GitHub repository, go to **Settings** > **Pages**
2. Under **Custom domain**, enter: `rndpig.com`
3. Check **Enforce HTTPS** (after DNS propagation)
4. GitHub will create a `CNAME` file in your repository

### Step 2: Configure GoDaddy DNS
1. Log into your [GoDaddy Domain Manager](https://dcc.godaddy.com/)
2. Find `rndpig.com` and click **DNS**
3. **Delete existing A records** pointing to parking pages
4. **Add these DNS records:**

**For apex domain (rndpig.com):**
```
Type: A
Name: @
Value: 185.199.108.153
TTL: 1 Hour

Type: A
Name: @
Value: 185.199.109.153
TTL: 1 Hour

Type: A
Name: @
Value: 185.199.110.153
TTL: 1 Hour

Type: A
Name: @
Value: 185.199.111.153
TTL: 1 Hour
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: YOUR_USERNAME.github.io
TTL: 1 Hour
```

### Step 3: Verification
1. DNS changes can take **up to 48 hours** to propagate
2. Check propagation: [DNS Checker](https://dnschecker.org/)
3. Verify your site loads at `https://rndpig.com`
4. GitHub will automatically provision SSL certificate

## � Updating Content

### Adding New Projects
1. Edit `index.html`
2. Add new project card in the `projects-grid` div:
```html
<div class="project-card">
    <h3>Project Name</h3>
    <p>Project description goes here.</p>
    <a href="https://project-url.com" class="project-link">View Project →</a>
</div>
```

### Updating Dept56 Gallery Link
Replace the `#` in the Dept56 Gallery project card with the actual URL:
```html
<a href="https://your-gallery-url.com" class="project-link">View Gallery →</a>
```

## � Technical Details

- **Framework**: Vanilla HTML, CSS, JavaScript (no dependencies)
- **Hosting**: GitHub Pages
- **Domain**: rndpig.com (via GoDaddy)
- **SSL**: Automatic via GitHub Pages
- **Performance**: Optimized for fast loading
- **Accessibility**: Semantic HTML and proper contrast ratios

## 📞 Support

For technical issues or questions:
- Check GitHub repository issues
- Review GitHub Pages documentation
- Contact GoDaddy support for domain-related issues

---

**Built for RND** | *Simple, clean, functional*