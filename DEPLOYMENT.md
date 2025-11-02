# 🚀 Deployment Guide: GitHub Pages + GoDaddy Domain

This guide will walk you through setting up your landing page on GitHub Pages and connecting your GoDaddy domain (rndpig.com).

## Part 1: Create Private GitHub Repository

### Step 1: Create Repository on GitHub
1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+" icon** in the top right → **"New repository"**
3. Repository settings:
   - **Repository name**: `rndpig-landing`
   - **Description**: `Minimalist portfolio landing page for RND applications`
   - **Visibility**: ✅ **Private**
   - **Initialize**: ❌ Do NOT check any boxes (we have existing files)
4. Click **"Create repository"**

### Step 2: Push Your Code to GitHub
Open PowerShell in your project directory and run these commands:

```powershell
# Navigate to your project (if not already there)
cd "C:\Users\rndpi\Documents\Coding Projects\rndpig-landing"

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Minimalist portfolio landing page"

# Set main branch
git branch -M main

# Add your GitHub repository as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/rndpig-landing.git

# Push to GitHub
git push -u origin main
```

**Note**: Replace `YOUR_USERNAME` with your actual GitHub username.

## Part 2: Enable GitHub Pages

### Step 1: Configure GitHub Pages
1. Go to your repository on GitHub: `https://github.com/YOUR_USERNAME/rndpig-landing`
2. Click the **"Settings"** tab (far right)
3. Scroll down to **"Pages"** in the left sidebar
4. Under **"Source"**:
   - Select **"Deploy from a branch"**
   - Branch: **"main"**
   - Folder: **"/ (root)"**
5. Click **"Save"**

### Step 2: Verify GitHub Pages URL
- Your site will be available at: `https://YOUR_USERNAME.github.io/rndpig-landing/`
- It may take a few minutes to become active
- GitHub will show the URL in the Pages settings once ready

## Part 3: Connect GoDaddy Domain

### Step 1: Add Custom Domain to GitHub
1. In your repository's **Settings** → **Pages**
2. Under **"Custom domain"**, enter: `rndpig.com`
3. Click **"Save"**
4. ✅ Check **"Enforce HTTPS"** (do this after DNS propagation)
5. GitHub will automatically create a `CNAME` file in your repository

### Step 2: Configure GoDaddy DNS Records

#### Login to GoDaddy
1. Go to [GoDaddy Domain Manager](https://dcc.godaddy.com/)
2. Sign in to your account
3. Find **"rndpig.com"** in your domain list
4. Click **"DNS"** (or **"Manage DNS"**)

#### Delete Existing Records
⚠️ **Important**: Delete any existing **A records** that point to parking pages or other services.

#### Add New DNS Records
Add these **exact** records:

**A Records (for apex domain rndpig.com):**
```
Type: A
Name: @
Value: 185.199.108.153
TTL: 1 Hour
```

```
Type: A
Name: @
Value: 185.199.109.153
TTL: 1 Hour
```

```
Type: A
Name: @
Value: 185.199.110.153
TTL: 1 Hour
```

```
Type: A
Name: @
Value: 185.199.111.153
TTL: 1 Hour
```

**CNAME Record (for www.rndpig.com):**
```
Type: CNAME
Name: www
Value: YOUR_USERNAME.github.io
TTL: 1 Hour
```

**Note**: Replace `YOUR_USERNAME` with your actual GitHub username.

### Step 3: Wait for DNS Propagation
- DNS changes can take **up to 48 hours** to fully propagate
- Usually takes **2-6 hours** in practice
- Check propagation status: [dnschecker.org](https://dnschecker.org/)

### Step 4: Enable HTTPS
1. Once DNS has propagated, return to GitHub → Settings → Pages
2. ✅ Check **"Enforce HTTPS"**
3. GitHub will automatically provision an SSL certificate

## Part 4: Verification & Testing

### Check Your Site
1. Visit `https://rndpig.com` - should load your landing page
2. Visit `https://www.rndpig.com` - should redirect to the main domain
3. Verify HTTPS is working (green lock icon in browser)

### Troubleshooting
If your domain doesn't load:
1. **Wait longer**: DNS can take up to 48 hours
2. **Check DNS**: Use [dnschecker.org](https://dnschecker.org/) to verify propagation
3. **Clear browser cache**: Try incognito/private browsing mode
4. **Verify GitHub Pages**: Ensure `https://YOUR_USERNAME.github.io/rndpig-landing/` works first

## Part 5: Future Updates

### Updating Your Site
When you want to make changes:

```powershell
# Make your changes to files
# Then commit and push:
git add .
git commit -m "Description of your changes"
git push
```

Changes will automatically deploy to your live site within a few minutes.

### Adding the Dept56 Gallery Link
When your gallery is ready, edit `index.html` and replace:
```html
<a href="#" class="project-link">View Gallery →</a>
```

With:
```html
<a href="https://your-gallery-url.com" class="project-link">View Gallery →</a>
```

Then commit and push the change.

## 📞 Support Resources

- **GitHub Pages Docs**: [docs.github.com/pages](https://docs.github.com/pages)
- **GoDaddy DNS Help**: [godaddy.com/help/dns](https://www.godaddy.com/help/dns)
- **DNS Checker**: [dnschecker.org](https://dnschecker.org/)
- **GitHub Support**: [support.github.com](https://support.github.com)

## ✅ Success Checklist

- [ ] GitHub repository created (private)
- [ ] Code pushed to GitHub
- [ ] GitHub Pages enabled
- [ ] Custom domain added (`rndpig.com`)
- [ ] GoDaddy DNS records updated
- [ ] DNS propagation complete
- [ ] HTTPS enabled
- [ ] Site loads at `https://rndpig.com`
- [ ] SSL certificate active (green lock)

---

**Your minimalist portfolio landing page should now be live at rndpig.com! 🎉**