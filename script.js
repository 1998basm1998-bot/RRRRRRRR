let products = JSON.parse(localStorage.getItem('products')) || [];
let cart = [];
let isScanning = false;
let scanMode = 'sell'; // 'sell' للبيع أو 'inventory' للمخزون

// دالة الصوت
function playBeep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.value = 800;
    gain.gain.value = 0.1;
    osc.start();
    setTimeout(() => osc.stop(), 100);
}

// --- وظائف المخزون ---
function saveProduct() {
    const barcode = document.getElementById('inv-barcode').value.trim(); // Trim لإزالة المسافات
    const name = document.getElementById('inv-name').value;
    const price = parseFloat(document.getElementById('inv-price').value);
    const qty = parseInt(document.getElementById('inv-qty').value);

    if(!barcode || !name || isNaN(price)) {
        alert("يرجى ملء البيانات بشكل صحيح");
        return;
    }

    const existingIndex = products.findIndex(p => p.barcode === barcode);
    if(existingIndex > -1) {
        products[existingIndex] = { barcode, name, price, qty };
        alert("تم تحديث المنتج");
    } else {
        products.push({ barcode, name, price, qty });
        alert("تم إضافة المنتج");
    }

    localStorage.setItem('products', JSON.stringify(products));
    // تفريغ الحقول
    document.getElementById('inv-barcode').value = '';
    document.getElementById('inv-name').value = '';
    document.getElementById('inv-price').value = '';
    document.getElementById('inv-qty').value = '';
    renderInventoryList();
}

function renderInventoryList() {
    const container = document.getElementById('inventory-list');
    container.innerHTML = products.map(p => `
        <div class="cart-item">
            <div class="item-info">
                <h4>${p.name}</h4>
                <p>باركود: ${p.barcode} | مخزون: ${p.qty}</p>
            </div>
            <div>${p.price}</div>
        </div>
    `).join('');
}

// --- تشغيل الكاميرا (للبيع أو المخزون) ---

// زر الكاميرا في صفحة البيع
function startSellingScan() {
    scanMode = 'sell';
    toggleScanner();
}

// زر الكاميرا الجديد في صفحة المخزون
function startInventoryScan() {
    scanMode = 'inventory';
    toggleScanner();
}

function toggleScanner() {
    const container = document.getElementById('scanner-container');
    if(container.style.display === 'none') {
        container.style.display = 'block';
        startScanner();
    } else {
        stopScanner();
    }
}

function startScanner() {
    if(isScanning) return;
    isScanning = true;

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: {
                facingMode: "environment"
            }
        },
        decoder: {
            // التعديل الهام: استخدام ean_reader فقط لضمان ثبات الرقم للمنتجات التجارية
            readers: ["ean_reader"] 
        }
    }, function(err) {
        if (err) {
            console.log(err);
            alert("خطأ: " + err);
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected(function(result) {
        const code = result.codeResult.code;
        handleScannedCode(code);
    });
}

function stopScanner() {
    Quagga.stop();
    document.getElementById('scanner-container').style.display = 'none';
    isScanning = false;
}

let lastScannedCode = null;
let lastScanTime = 0;

function handleScannedCode(code) {
    const now = new Date().getTime();
    if (code === lastScannedCode && (now - lastScanTime < 1500)) return;
    
    lastScannedCode = code;
    lastScanTime = now;
    playBeep();

    // التحقق من الوضع (مخزون أم بيع)
    if (scanMode === 'inventory') {
        // إذا كنا في المخزون، نضع الكود في الحقل ونغلق الكاميرا
        document.getElementById('inv-barcode').value = code;
        stopScanner();
        showToast("تم التقاط الباركود");
        return; 
    }

    // إذا كنا في وضع البيع (الكود القديم)
    const product = products.find(p => p.barcode === code);
    if(product) {
        addToCart(product);
        showToast(`تم مسح: ${product.name}`);
    } else {
        alert(`المنتج ${code} غير موجود!`);
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.opacity = 1;
    setTimeout(() => toast.style.opacity = 0, 2000);
}

// --- باقي وظائف السلة ---
function addToCart(product) {
    const existingItem = cart.find(item => item.barcode === product.barcode);
    if(existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    renderCart();
}

function renderCart() {
    const list = document.getElementById('cart-list');
    const finalList = document.getElementById('final-cart-list');
    let total = 0;

    const html = cart.map((item, index) => {
        total += item.price * item.qty;
        return `
        <div class="cart-item">
            <div class="item-info">
                <h4>${item.name}</h4>
                <p>${item.price} × ${item.qty}</p>
            </div>
            <div class="qty-controls">
                <button class="qty-btn" onclick="updateQty(${index}, -1)">-</button>
                <span>${item.qty}</span>
                <button class="qty-btn" onclick="updateQty(${index}, 1)">+</button>
            </div>
        </div>`;
    }).join('');

    list.innerHTML = html || '<p style="text-align:center;color:#999">السلة فارغة</p>';
    if(finalList) finalList.innerHTML = html;
    
    document.getElementById('total-price').innerText = total.toFixed(2);
    document.getElementById('final-total').innerText = total.toFixed(2);
}

function updateQty(index, change) {
    cart[index].qty += change;
    if(cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    renderCart();
}

function goToCheckout() {
    if(cart.length === 0) {
        alert("السلة فارغة!");
        return;
    }
    const navButtons = document.querySelectorAll('.nav-item');
    showSection('checkout-section', navButtons[2]);
}

function confirmSale() {
    if(cart.length === 0) return;
    cart.forEach(cartItem => {
        const productIndex = products.findIndex(p => p.barcode === cartItem.barcode);
        if(productIndex > -1) {
            products[productIndex].qty -= cartItem.qty;
        }
    });
    localStorage.setItem('products', JSON.stringify(products));
    alert("تم البيع!");
    cart = [];
    renderCart();
    renderInventoryList();
    showSection('home-section', document.querySelectorAll('.nav-item')[0]);
}

function clearCart() {
    if(confirm("إلغاء الفاتورة؟")) {
        cart = [];
        renderCart();
        showSection('home-section', document.querySelectorAll('.nav-item')[0]);
    }
}

function showSection(id, btn) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');

    if(id === 'inventory-section') renderInventoryList();
    
    if(id !== 'home-section' && isScanning && scanMode === 'sell') {
        stopScanner();
    }
}

renderInventoryList();
