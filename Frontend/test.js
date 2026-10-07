const toast = document.getElementById('toast')
let toastTimer
function showToast(message){
    toast.textContent = message
    toast.classList.add('show')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
        toast.classList.remove('show')
    }, 3000)
}

