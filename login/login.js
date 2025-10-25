const backendUrl="http://127.0.0.1:5000";

document.getElementById("LoginSubmit").addEventListener("click",async ()=>{
    const username=document.getElementById("username").value.trim();
    const password=document.getElementById("password").value.trim();
    if (!username || !password){
        alert("enter both username and password");
        return;;
    }
    try {
        const res=await fetch(`${backendUrl}/login`,{
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: username,
                password: password,
            }),
        });
        const data=await res.json();
        if (res.ok) {
            alert("User logged in!");
            console.log(data);
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Error:", err);
        alert("Server connection failed.");
    }
})