//Toggle class active
const navbarNav = document.querySelector(".navbar-nav");
const hamburger = document.querySelector("#hamburger-menu");

//link kosong (href="#") jangan bikin halaman loncat ke atas
document.querySelectorAll('a[href="#"]').forEach((link) => {
    link.addEventListener("click", (e) => e.preventDefault());
});

//ketika hamburger menu di klik
hamburger.onclick = () => {
    navbarNav.classList.toggle("active");
};

//klik diluar sidebar untuk menghilangkan nav
document.addEventListener("click", function(e){
    if(!hamburger.contains(e.target) && !navbarNav.contains(e.target)){
        navbarNav.classList.remove("active");
    }
});

//klik salah satu menu -> sidebar ikut menutup
navbarNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
        navbarNav.classList.remove("active");
    });
});
