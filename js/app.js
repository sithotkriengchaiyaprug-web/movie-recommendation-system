document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Navbar Scroll Effect
    const navbar = document.getElementById("navbar");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    });

    // 2. Carousel Horizontal Scroll Logic
    const leftArrows = document.querySelectorAll('.left-arrow');
    const rightArrows = document.querySelectorAll('.right-arrow');

    leftArrows.forEach(arrow => {
        arrow.addEventListener('click', () => {
            const row = arrow.nextElementSibling;
            row.scrollBy({ left: -window.innerWidth / 2, behavior: 'smooth' });
        });
    });

    rightArrows.forEach(arrow => {
        arrow.addEventListener('click', () => {
            const row = arrow.previousElementSibling;
            row.scrollBy({ left: window.innerWidth / 2, behavior: 'smooth' });
        });
    });

    // Close modal if clicked outside of content
    const modal = document.getElementById('movieModal');
    if(modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
});

// Modal Controls
function openModal() {
    const modal = document.getElementById('movieModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // prevent bg scrolling
}

function closeModal() {
    const modal = document.getElementById('movieModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}