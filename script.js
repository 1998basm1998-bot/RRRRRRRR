let products = JSON.parse(localStorage.getItem('products')) || [];
let customers = JSON.parse(localStorage.getItem('customers')) || [];
let cart = [];
let isScanning = false;
let scanMode = 'sell'; 
let isEditing = false; 

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

// --- وظائف المخزون (إضافة / تعديل / حذف) ---
function saveProduct() {
    const barcode = document.getElementById('inv-barcode').value.trim();
    const name = document.getElementById('inv-name').value;
    const price = parseFloat(document.getElementById('inv-price').value);
    const qty = parseInt(document.getElementById('inv-qty').value);
    const oldBarcode = document.getElementById('inv-old-barcode').value;

    if(!barcode || !name || isNaN(price)) {
        alert("يرجى ملء البيانات بشكل صحيح");
        return;
    }

    if (isEditing) {
        const index = products.findIndex(p => p.barcode === oldBarcode);
        if (index > -1) {
            products[index] = { barcode, name, price, qty };
            alert("تم تعديل المنتج بنجاح");
            cancelEdit(); 
        }
    } else {
        const existingIndex = products.findIndex(p => p.barcode === barcode);
        if(existingIndex > -1) {
            if(confirm("المنتج موجود بالفعل، هل تريد تحديث بياناته؟")) {
                products[existingIndex] = { barcode, name, price, qty };
            }
        } else {
            products.push({ barcode, name, price, qty });
            alert("تم إضافة المنتج");
        }
    }

    localStorage.setItem('products', JSON.stringify(products));
    clearInvInputs();
    renderInventoryList();
}

function editProduct(barcode) {
    const product = products.find(p => p.barcode === barcode);
    if (!product) return;

    document.getElementById('inv-barcode').value = product.barcode;
    document.getElementById('inv-name').value = product.name;
    document.getElementById('inv-price').value = product.price;
    document.getElementById('inv-qty').value = product.qty;
    
    document.getElementById('inv-old-barcode').value = product.barcode;
    document.getElementById('inv-title').innerHTML = '<i class="fa-solid fa-pen"></i> تعديل منتج';
    document.getElementById('save-product-btn').innerText = 'تحديث التعديلات';
    document.getElementById('save-product-btn').className = 'btn btn-info'; 
    document.getElementById('cancel-edit-btn').style.display = 'block';
    
    isEditing = true;
    document.querySelector('.card').scrollIntoView({behavior: 'smooth'});
}

function cancelEdit() {
    isEditing = false;
    clearInvInputs();
    document.getElementById('inv-title').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة منتج جديد';
    document.getElementById('save-product-btn').innerText = 'حفظ المنتج';
    document.getElementById('save-product-btn').className = 'btn btn-accent';
    document.getElementById('cancel-edit-btn').style.display = 'none';
}

function deleteProduct(barcode) {
    if(confirm("هل أنت متأكد من حذف هذا المنتج نهائياً؟")) {
        products = products.filter(p => p.barcode !== barcode);
        localStorage.setItem('products', JSON.stringify(products));
        renderInventoryList();
    }
}

function clearInvInputs() {
    document.getElementById('inv-barcode').value = '';
    document.getElementById('inv-name').value = '';
    document.getElementById('inv-price').value = '';
    document.getElementById('inv-qty').value = '';
    document.getElementById('inv-old-barcode').value = '';
}

function renderInventoryList() {
    const container = document.getElementById('inventory-list');
    container.innerHTML = products.map(p => `
        <div class="cart-item">
            <div class="item-info">
                <h4>${p.name}</h4>
                <p>${p.barcode} | مخزون: ${p.qty}</p>
                <div style="font-weight:bold; color:var(--accent-color); margin-top:5px;">
                    ${Number(p.price).toLocaleString()} د.ع
                </div>
            </div>
            <div class="action-buttons">
                <button class="mini-btn btn-edit" onclick="editProduct('${p.barcode}')">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="mini-btn btn-delete" onclick="deleteProduct('${p.barcode}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// --- وظائف الزبائن ---
function addCustomer() {
    const name = document.getElementById('cust-name').value.trim();
    let phone = document.getElementById('cust-phone').value.trim();

    if (!name || !phone) {
        alert("يرجى إدخال الاسم ورقم الهاتف");
        return;
    }

    if (!phone.startsWith('7')) {
        alert("يجب أن يبدأ رقم الهاتف بـ 7 (بدون الصفر الأولي)");
        return;
    }
    
    const fullPhone = "+964" + phone;

    customers.push({
        id: Date.now(),
        name: name,
        phone: fullPhone,
        transactions: [],
        totalDebt: 0
    });

    localStorage.setItem('customers', JSON.stringify(customers));
    alert("تم إضافة الزبون");
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-phone').value = '';
    renderCustomerList();
    updateCheckoutCustomerSelect();
}

function renderCustomerList() {
    const container = document.getElementById('customer-list');
    const searchTerm = document.getElementById('cust-search').value.toLowerCase();
    
    const filteredCustomers = customers.filter(c => c.name.toLowerCase().startsWith(searchTerm) || c.name.toLowerCase().includes(searchTerm));

    container.innerHTML = filteredCustomers.map(c => `
        <div class="customer-card-item" onclick="showCustomerDetails(${c.id})">
            <div style="display:flex; justify-content:space-between;">
                <strong>${c.name}</strong>
                <span>${c.totalDebt.toLocaleString()} د.ع (ديون)</span>
            </div>
            <div style="font-size:0.8rem; color:#666; direction:ltr; text-align:right;">${c.phone}</div>
        </div>
    `).join('');
}

function showCustomerDetails(id) {
    const customer = customers.find(c => c.id === id);
    if(!customer) return;

    document.getElementById('modal-cust-name').innerText = customer.name;
    document.getElementById('modal-cust-phone').innerText = customer.phone;
    document.getElementById('modal-cust-debt').innerText = customer.totalDebt.toLocaleString() + ' د.ع';
    
    const historyContainer = document.getElementById('modal-cust-history');
    if (customer.transactions.length === 0) {
        historyContainer.innerHTML = '<p>لا توجد معاملات سابقة</p>';
    } else {
        historyContainer.innerHTML = customer.transactions.map(t => `
            <div style="border-bottom:1px solid #eee; padding:5px 0; font-size:0.9rem;">
                <div>${t.date}</div>
                <div>المجموع: ${t.total} | واصل: ${t.paid} | باقي: ${t.remaining}</div>
            </div>
        `).join('');
    }

    document.getElementById('customer-details-modal').style.display = 'flex';
}

function closeCustomerModal() {
    document.getElementById('customer-details-modal').style.display = 'none';
}

function updateCheckoutCustomerSelect() {
    const select = document.getElementById('checkout-customer-select');
    let opts = '<option value="">زبون عام (نقدي)</option>';
    opts += customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    select.innerHTML = opts;
}

// --- تشغيل الكاميرا (الإصدار الشامل لكل الباركودات) ---
function startSellingScan() {
    scanMode = 'sell';
    toggleScanner();
}

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

    let lastDetectedCode = null;
    let detectionCount = 0;

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: {
                facingMode: "environment",
                width: { min: 640 },
                height: { min: 480 }
            }
        },
        locate: true, // مهم جداً للتعرف على مكان الباركود
        decoder: {
            // هنا التعديل الجوهري: إضافة كل أنواع القراءات الممكنة
            readers: [
                "ean_reader",        // المنتجات الأوروبية والعالمية (الشائع)
                "ean_8_reader",      // المنتجات الصغيرة
                "code_128_reader",   // الباركود الكثيف (مثل الصورة الثانية)
                "code_39_reader",    // باركود صناعي قديم
                "code_39_vin_reader", 
                "upc_reader",        // المنتجات الأمريكية
                "upc_e_reader",      // النسخة المصغرة الأمريكية
                "codabar_reader"     // يستخدم في المكتبات والشحن
            ], 
            multiple: false
        },
        locator: {
            patchSize: "medium",
            halfSample: true
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

        // التحقق من تكرار القراءة لضمان الدقة (3 مرات)
        if (code === lastDetectedCode) {
            detectionCount++;
        } else {
            lastDetectedCode = code;
            detectionCount = 0;
        }

        if (detectionCount > 3) {
            handleScannedCode(code);
            detectionCount = 0;
            lastDetectedCode = null; 
        }
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
    if (code === lastScannedCode && (now - lastScanTime < 2000)) return;
    
    lastScannedCode = code;
    lastScanTime = now;
    playBeep();

    if (scanMode === 'inventory') {
        document.getElementById('inv-barcode').value = code;
        stopScanner();
        showToast("تم التقاط الباركود");
        return; 
    }

    const product = products.find(p => p.barcode === code);
    if(product) {
        addToCart(product);
        showToast(`تم مسح: ${product.name}`);
    } else {
        alert(`المنتج ${code} غير موجود في المخزون!`);
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.opacity = 1;
    setTimeout(() => toast.style.opacity = 0, 2000);
}

// --- وظائف السلة والبيع ---
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
                <p>${Number(item.price).toLocaleString()} د.ع × ${item.qty}</p>
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
    
    document.getElementById('total-price').innerText = total.toLocaleString() + ' د.ع';
    document.getElementById('final-total').innerText = total.toLocaleString() + ' د.ع';
    
    calculateRemaining(); 
}

function updateQty(index, change) {
    cart[index].qty += change;
    if(cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    renderCart();
}

function calculateRemaining() {
    let total = 0;
    cart.forEach(item => total += item.price * item.qty);
    
    const paid = parseFloat(document.getElementById('amount-paid').value) || 0;
    const remaining = total - paid;
    
    const label = remaining > 0 ? "المتبقي (دين): " : "الباقي للزبون: ";
    document.getElementById('amount-remaining').innerText = label + Math.abs(remaining).toLocaleString();
    return { total, paid, remaining };
}

function goToCheckout() {
    if(cart.length === 0) {
        alert("السلة فارغة!");
        return;
    }
    updateCheckoutCustomerSelect();
    const navButtons = document.querySelectorAll('.nav-item');
    showSection('checkout-section', navButtons[3]); 
}

function confirmSale() {
    if(cart.length === 0) return;

    const { total, paid, remaining } = calculateRemaining();
    const custId = document.getElementById('checkout-customer-select').value;
    
    cart.forEach(cartItem => {
        const productIndex = products.findIndex(p => p.barcode === cartItem.barcode);
        if(productIndex > -1) {
            products[productIndex].qty -= cartItem.qty;
        }
    });
    localStorage.setItem('products', JSON.stringify(products));

    let whatsappLink = "";

    if (custId) {
        const customer = customers.find(c => c.id == custId);
        if (customer) {
            customer.transactions.push({
                date: new Date().toLocaleDateString('ar-IQ'),
                items: cart,
                total: total,
                paid: paid,
                remaining: remaining
            });
            if (remaining > 0) {
                customer.totalDebt += remaining;
            }
            localStorage.setItem('customers', JSON.stringify(customers));

            let msg = `*فاتورة إلكترونية - كاشير برو*%0a`;
            msg += `مرحباً ${customer.name}%0a`;
            msg += `------------------%0a`;
            cart.forEach(item => {
                msg += `${item.name} (${item.qty}) : ${item.price * item.qty}%0a`;
            });
            msg += `------------------%0a`;
            msg += `*المجموع الكلي:* ${total.toLocaleString()}%0a`;
            msg += `*الواصل:* ${paid.toLocaleString()}%0a`;
            msg += `*الباقي/الدين:* ${remaining.toLocaleString()}%0a`;
            
            const phoneClean = customer.phone.replace('+', '');
            whatsappLink = `https://wa.me/${phoneClean}?text=${msg}`;
        }
    }

    alert("تمت عملية البيع وحفظ البيانات!");
    
    if (whatsappLink) {
        window.open(whatsappLink, '_blank');
    }

    cart = [];
    document.getElementById('amount-paid').value = '';
    renderCart();
    renderInventoryList();
    renderCustomerList(); 
    showSection('home-section', document.querySelectorAll('.nav-item')[0]);
}

function clearCart() {
    if(confirm("إلغاء الفاتورة؟")) {
        cart = [];
        document.getElementById('amount-paid').value = '';
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
    if(id === 'customers-section') renderCustomerList();
    
    if(id !== 'home-section' && isScanning && scanMode === 'sell') {
        stopScanner();
    }
}

renderInventoryList();
renderCustomerList();
