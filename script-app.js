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

    // Show login modal on page load
    $('#loginModal').modal('show');

    // Start camera with selected facing mode
    startCamera.on('click', function() {
        const facingMode = cameraSelect.val();
        navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: facingMode }
        })
            .then(function(stream) {
                video.srcObject = stream;
                startCamera.hide();
                takePhoto.show();
                cameraSelect.hide();
            })
            .catch(function(err) {
                console.error("Camera access failed:", err);
                alert("Failed to access camera.");
            });
    });

    // Capture photo and display on canvas
    takePhoto.on('click', function() {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        $('#video-container').hide();
        $('#canvas-container').show();
        takePhoto.hide();
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

    // Placeholder function to simulate image upload and return a web link
    function uploadImage(blob, imageName) {
        // TODO: Replace with actual server-side upload (e.g., AWS S3, Firebase, or custom server)
        // Example: POST blob to /upload endpoint and return public URL
        return `https://your-server.com/images/${imageName}`; // Placeholder URL
    }

    // Handle survey form submission
    $('#survey-form').submit(async function(e) {
        e.preventDefault();
        let dataUrl = canvas.toDataURL();
        let imageName = `survey_${Date.now()}.png`;
        let imageBlob = dataURItoBlob(dataUrl);
        let imageUrl = await uploadImage(imageBlob, imageName); // Await server response

        // Format timestamp in IST (UTC + 5:30)
        let date = new Date();
        date.setHours(date.getHours() + 5); // Adjust for IST
        date.setMinutes(date.getMinutes() + 30);
        let timestamp = date.toISOString().replace('T', ' ').substring(0, 19);

        let entry = {
            shopOwner: $('#shop-owner-name').val(),
            mobile: $('#owner-mobile-number').val(),
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

        // Reset form and UI
        $('#survey-form')[0].reset();
        $('#location').text('');
        $('#canvas-container').hide();
        $('#video-container').show();
        startCamera.show();
        cameraSelect.show();
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
            let link = { text: 'View/Download Photo', hyperlink: entry.photoUrl };
            row.getCell(4).value = link;
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
} contents here
