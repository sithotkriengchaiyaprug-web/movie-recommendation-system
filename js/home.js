// 1. เก็บตัวแปรเก็บหนังที่ถูกเลือก (ของผม) ไว้ด้านบน
let selectedMovies = [];

// 2. ฟังก์ชันคลิกเลือกหนัง (ของผม) ก๊อปมาวางไว้เลย
function toggleMovie(movieId, movieTitle, cardElement) {
    const index = selectedMovies.indexOf(movieId);
    const imgElement = cardElement.querySelector('img');

    if (index === -1) {
        selectedMovies.push(movieId);
        imgElement.style.border = "4px solid #E50914"; 
        imgElement.style.opacity = "0.7";
        cardElement.style.transform = "scale(0.95)";
    } else {
        selectedMovies.splice(index, 1);
        imgElement.style.border = "none";
        imgElement.style.opacity = "1";
        cardElement.style.transform = "scale(1)";
    }
    console.log("👉 หนังที่รอคัดกรอง (พร้อมส่ง API):", selectedMovies);
}

// ==========================================
// 3. รวมร่าง! เอาโค้ดดึง API เก่าของคุณ มาผสมกับโค้ดสร้างกล่องของผม
// ==========================================
async function loadMoviesFromBackend() {
    const container = document.getElementById('movieListContainer');
    container.innerHTML = '<p>กำลังโหลดข้อมูลหนังจาก Database...</p>';

    try {
        // 🟢 ตรงนี้คือ "โค้ดเก่าของคุณ" ที่ดึงข้อมูลจาก API จริงๆ
        const response = await fetch('http://localhost:3000/api/movies'); // ลิงก์ API เก่าของคุณ
        const realMoviesData = await response.json();
        
        container.innerHTML = ''; // โหลดเสร็จ ลบข้อความทิ้ง

        // 🟢 เอาข้อมูลจริง มาวนลูปใส่ "กล่อง UI สวยๆ ของผม"
        realMoviesData.forEach(movie => {
            const card = document.createElement('div');
            card.className = 'poster-card'; 
            card.id = `movie-${movie.id}`;
            card.style.padding = '0';
            card.style.backgroundColor = 'transparent';
            card.style.border = 'none';

            // หมายเหตุ: เช็คชื่อตัวแปรรูปภาพให้ตรงกับ Database ของคุณ (เช่น movie.poster, movie.image_url)
            // ถ้า DB เก่าไม่มีรูปลิงก์รูป ให้ใส่รูปจำลองไปก่อนได้ครับ
            const imageUrl = movie.image_url || "https://via.placeholder.com/200x300?text=No+Image";

            card.innerHTML = `
                <img src="${imageUrl}" alt="${movie.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
            `;

            // ผูกระบบคลิกเข้ากับหนังที่ดึงมาจาก DB จริงๆ
            card.onclick = () => toggleMovie(movie.id, movie.title, card);

            container.appendChild(card);
        });

    } catch (error) {
        console.error("โหลดข้อมูลไม่สำเร็จ:", error);
        container.innerHTML = '<p>เกิดข้อผิดพลาดในการดึงข้อมูล</p>';
    }
}

// 4. สั่งโหลดเมื่อเปิดหน้าเว็บ
document.addEventListener("DOMContentLoaded", () => {
    loadMoviesFromBackend();
}); 