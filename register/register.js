const backendUrl="http://127.0.0.1:5000";
document.getElementById("RegisterSubmit").addEventListener("click", async (e) => {
    e.preventDefault();
    const data = {
        first_name: document.getElementById("first_name").value,
        last_name: document.getElementById("last_name").value,
        dob: document.getElementById("dob").value,
        username: document.getElementById("username").value,
        password: document.getElementById("password").value,
        confirm_password: document.getElementById("confirm_password").value,
        age: document.getElementById("age").value,
        sex: document.getElementById("sex").value,
        occupation: document.getElementById("occupation").value
    };

    if (data.password !== data.confirm_password) {
        alert("Passwords do not match!");
        return;
    }

    // Send data to Flask backend
    const response = await fetch(`${backendUrl}/register`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    });
    if (response.ok) {
        alert("User registered in!");
        window.location.href = `../iqtest/IQTest.html?username=${data.username}`;
    }  
        const result = await response.json();
        alert(result.message);
});
