// Firebase configuration (replace with your Firebase project config)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();

// Object to store surveyor credentials (username: password)
let surveyors = {
    "surveyor1": "password1",
    "admin": "admin"
};

// Array to store survey data
let surveyData = [];

// Track logged-in user
let currentUser = null;

$(document).ready(function() {
    // DOM elements
    const video = $('#video')[0];
    const canvas = $('#canvas')[0];
    const context = canvas.getContext('2d');
    const startCamera = $('#start-camera');
    const takePhoto = $('#take-photo');
    const cameraSelect = $('#camera-select');

    // Show login modal on page load with error handling
    try {
        $('#loginModal').modal({
            backdrop: 'static', // Prevent closing by clicking outside
            keyboard: false // Prevent closing with ESC key
        });
        $('#loginModal').modal('show');
    } catch (err) {
        console.error("Failed to show login modal:", err);
        alert("Error initializing login modal. Please check if Bootstrap is loaded correctly.");
    }

    // Start camera with selected facing mode
    startCamera.on('click', function() {
        const facingMode = cameraSelect.val();
        navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: facingMode }
        })
            .then(function(stream) {
                video.srcObject = stream;
                video.stream = stream; // Store stream for cleanup
                startCamera.hide();
                takePhoto.show();
                cameraSelect.hide();
            })
            .catch(function(err) {
                console.error("Camera access failed:", err);
                alert("Failed to access camera.");
            });
    });

    // Capture photo and stop camera stream
    takePhoto.on('click', function() {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        $('#video-container').hide();
        $('#canvas-container').show();
        takePhoto.hide();
        // Stop camera stream
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
    });

    // Get geolocation on button click
    $('#get-location').click(function() {
        navigator.geolocation.getCurrentPosition(
            function(pos) {
                $('#location').text(`Lat: ${pos.coords.latitude}, Lon: ${pos.coords.longitude}`);
            },
            function(err) {
                console.error("Geolocation failed:", err);
                alert("Failed to get location.");
            }
        );
    });

    // Handle login form submission
    $('#login-form').submit(function(e) {
        e.preventDefault();
        let username = $('#username').val();
        let password = $('#password').val();
        if (surveyors[username] === password) {
            currentUser = username; // Store logged-in user
            $('#loginModal').modal('hide');
            if (username === 'admin') {
                $('#adminModal').modal('show');
            } else {
                $('#surveyModal').modal('show');
            }
        } else {
            alert("Invalid credentials");
        }
    });

    // Upload image to Firebase Storage
    async function uploadImage(blob, imageName) {
        try {
            const storageRef = storage.ref(`images/${imageName}`);
            await storageRef.put(blob);
            const url = await storageRef.getDownloadURL();
            return url;
        } catch (err) {
            console.error("Image upload failed:", err);
            alert("Failed to upload image.");
            throw err;
        }
    }

    // Handle survey form submission
    $('#survey-form').submit(async function(e) {
        e.preventDefault();

        // Validate mobile number
        const mobile = $('#owner-mobile-number').val();
        if (!/^[0-9]{10}$/.test(mobile)) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }

        let dataUrl = canvas.toDataURL();
        let imageName = `survey_${Date.now()}.png`;
        let imageBlob = dataURItoBlob(dataUrl);
        let imageUrl;
        try {
            imageUrl = await uploadImage(imageBlob, imageName);
        } catch (err) {
            return; // Stop submission if upload fails
        }

        // Format timestamp in IST (DD-MM-YYYY HH:MM:SS)
        let date = new Date();
        date.setHours(date.getHours() + 5);
        date.setMinutes(date.getMinutes() + 30);
        let timestamp = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

        let entry = {
            shopOwner: $('#shop-owner-name').val(),
            mobile: mobile,
            type: $('#shop-type').val(),
            location: $('#location').text(),
            photoUrl: imageUrl,
            surveyorId: currentUser,
            timestamp: timestamp
        };

        surveyData.push(entry);

        // Update table with all columns
        $('#survey-table-body').append(`
            <tr>
                <td>${entry.shopOwner}</td>
                <td>${entry.mobile}</td>
                <td>${entry.type}</td>
                <td><a href="${entry.photoUrl}" target="_blank" download="${imageName}">View/Download Photo</a></td>
                <td>${entry.location}</td>
                <td>${entry.surveyorId}</td>
                <td>${entry.timestamp}</td>
            </tr>
        `);

        // Show success alert
        $('body').append(`
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                Survey submitted successfully!
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `);
        setTimeout(() => $('.alert').alert('close'), 3000);

        // Reset form and UI
        $('#survey-form')[0].reset();
        $('#location').text('');
        $('#canvas-container').hide();
        $('#video-container').show();
        startCamera.show();
        cameraSelect.show();
        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
    });

    // Handle new surveyor credential creation
    $('#create-credentials-form').submit(function(e) {
        e.preventDefault();
        let username = $('#new-username').val();
        let password = $('#new-password').val();
        if (username && password) {
            surveyors[username] = password;
            refreshUsers();
            $('#create-credentials-form')[0].reset();
        } else {
            alert("Please provide both username and password.");
        }
    });

    // Refresh user list in admin panel
    function refreshUsers() {
        $('#existing-credentials').empty();
        for (let username in surveyors) {
            if (username !== 'admin') {
                $('#existing-credentials').append(`
                    <li>${username} 
                        <button class="delete-user btn btn-sm btn-danger" data-user="${username}">Delete</button>
                    </li>
                `);
            }
        }
    }

    // Delete user on button click
    $(document).on('click', '.delete-user', function() {
        let user = $(this).data('user');
        delete surveyors[user];
        refreshUsers();
    });

    // Export survey data to Excel
    $('#export-to-excel').click(function() {
        let wb = new ExcelJS.Workbook();
        let ws = wb.addWorksheet('Survey Data');
        ws.addRow(['Shop Owner', 'Mobile', 'Shop Type', 'Photo Link', 'Location', 'Surveyor ID', 'Timestamp']);

        surveyData.forEach(entry => {
            let row = ws.addRow([
                entry.shopOwner,
                entry.mobile,
                entry.type,
                '', // Placeholder for hyperlink
                entry.location,
                entry.surveyorId,
                entry.timestamp
            ]);
            let linkCell = row.getCell(4);
            linkCell.value = { text: 'View/Download Photo', hyperlink: entry.photoUrl };
            linkCell.font = { color: { argb: 'FF0000FF' }, underline: true }; // Blue, underlined
        });

        wb.xlsx.writeBuffer().then(buf => {
            let blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            let a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'survey_data.xlsx';
            a.click();
        }).catch(err => {
            console.error("Excel export failed:", err);
            alert("Failed to export data.");
        });
    });

    // Initialize user list
    refreshUsers();
});

// Convert data URI to Blob for image handling
function dataURItoBlob(dataURI) {
    let byteString = atob(dataURI.split(',')[1]);
    let ab = new ArrayBuffer(byteString.length);
    let ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: 'image/png' });
}
