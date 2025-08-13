// This is a Netlify Function that acts as a secure proxy to the Gemini API.
exports.handler = async function (event) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    try {
        // Get the API key from environment variables
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set in environment variables. Please check your Netlify site configuration.");
        }

        // Get the original text from the request body
        const { originalText } = JSON.parse(event.body);
        if (!originalText) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'originalText is required.' }) 
            };
        }

        // Construct the detailed prompt for Gemini
        const prompt = `
Bạn là một trợ lý chuyên nghiệp về trình bày và biên tập văn bản. Nhiệm vụ của bạn là nhận một đoạn văn bản thô và định dạng lại nó theo MẪU được cung cấp một cách chính xác tuyệt đối. KHÔNG thay đổi nội dung gốc.

**QUY TẮC CHUNG:**
- **KHÔNG SÁNG TẠO:** Chỉ sắp xếp và làm sạch văn bản gốc. Không thêm, bớt hay thay đổi bất kỳ từ ngữ nào trong nội dung.
- **KHÔNG GIẢI THÍCH:** Chỉ trả về duy nhất văn bản đã được định dạng. Không thêm bất kỳ lời giới thiệu, giải thích hay bình luận nào.

**CÁC BƯỚC ĐỊNH DẠNG:**

1.  **Xử lý Tiêu đề:**
    * Tìm dòng tiêu đề tiếng Việt (thường có emoji ❤️).
    * Xóa emoji và các ký tự đặc biệt.
    * Định dạng lại tiêu đề thành CHỮ IN HOA.
    * Đặt tiêu đề đã xử lý ở dòng đầu tiên.

2.  **Xử lý Đối thoại tiếng Việt:**
    * Xác định các lượt nói của "Nam thính giả" và "Đài Trưởng".
    * Làm sạch các emoji (☎️, 📞) nhưng **GIỮ LẠI** và **CHUẨN HÓA** tiền tố người nói. Ví dụ: "☎️Nam thính giả:" -> "Nam thính giả:", "📞Đài Trưởng đáp:" -> "Đài Trưởng đáp:".
    * Đối với các câu trả lời trong ngoặc đơn như \`(Được 7 tháng rồi)\`, hãy xác định người nói trước đó (là Nam thính giả) và định dạng lại thành "Nam thính giả: Được 7 tháng rồi".
    * Mỗi lượt nói phải nằm trên một dòng riêng.

3.  **Xử lý Nguồn:**
    * Tìm dòng chứa thông tin nguồn (ví dụ: \`wenda...\`).
    * Chỉ giữ lại MỘT dòng nguồn duy nhất, xóa các dòng bị lặp lại.
    * Đặt dòng nguồn này sau khối đối thoại tiếng Việt.

4.  **Xử lý Văn bản tiếng Trung:**
    * Tách tiêu đề tiếng Trung ra một dòng riêng.
    * Giữ nguyên khối đối thoại tiếng Trung, bao gồm cả tiền tố người nói.

5.  **Xử lý Lời kết:**
    * Tìm câu kết (bắt đầu bằng "Trong quá trình dịch...").
    * Xóa emoji 🙏 ở cuối câu.
    * Đặt câu kết này ở vị trí cuối cùng của toàn bộ văn bản.

6.  **Sắp xếp và Trình bày:**
    * Sắp xếp các khối theo thứ tự sau:
        1.  Tiêu đề tiếng Việt (IN HOA)
        2.  Đối thoại tiếng Việt (có tiền tố người nói)
        3.  Nguồn
        4.  Tiêu đề tiếng Trung
        5.  Đối thoại tiếng Trung
        6.  Lời kết
    * Sử dụng hai lần xuống dòng (một dòng trống) để ngăn cách các khối chính.

**Bây giờ, hãy xử lý văn bản sau theo đúng các quy tắc trên:**

---VĂN BẢN GỐC---
${originalText}
---HẾT VĂN BẢN GỐC---
`;
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        };

        // Use node-fetch for making the API call in the function environment
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("API Error:", errorBody);
            return { 
                statusCode: response.status, 
                body: JSON.stringify({ error: `API Error: ${response.statusText}. Check function logs on Netlify for more details.` }) 
            };
        }

        const result = await response.json();
        const formattedText = result.candidates[0].content.parts[0].text;

        // Return the successful response to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ formattedText: formattedText.trim() })
        };

    } catch (error) {
        console.error("Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
