// Smooth Scrolling for Navigation Links
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add active state to navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');
    
    function setActiveNavLink() {
        let current = 'home';
        sections.forEach(section => {
            const sectionTop = section.getBoundingClientRect().top;
            const sectionHeight = section.clientHeight;
            if (sectionTop <= 100 && sectionTop + sectionHeight > 100) {
                current = section.getAttribute('id') || 'home';
            }
        });

        navLinks.forEach(link => {
            const isActive = link.getAttribute('href') === '#' + current;
            link.style.color = isActive ? 'var(--accent-primary)' : 'var(--text-secondary)';
        });
    }

    // Set active link on scroll
    window.addEventListener('scroll', setActiveNavLink);
    setActiveNavLink();

    // Add subtle parallax effect to welcome section
    const welcomeSection = document.querySelector('.welcome');
    if (welcomeSection) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;
            welcomeSection.style.transform = `translateY(${rate}px)`;
        });
    }
});