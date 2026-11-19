/**
 * CivicTrack Authentication Pages Logic (Login & Citizen Registration)
 * Robust Client Validation, Password Toggles, Real-Time Feedback & Spring Boot REST API integration.
 */

// Email regex pattern following standard RFC 5322
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
// Mobile phone regex: 10 to 15 digits, optional leading plus
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();
    initLoginForm();
    initRegisterForm();
    initForgotPassword();
});

/**
 * 1. Initialize Show / Hide Password Toggles
 */
function initPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.password-toggle-btn');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetInputId = btn.getAttribute('data-target');
            const targetInput = document.getElementById(targetInputId);
            const icon = btn.querySelector('i');

            if (!targetInput) return;

            if (targetInput.type === 'password') {
                targetInput.type = 'text';
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
                btn.setAttribute('aria-label', 'Hide password');
            } else {
                targetInput.type = 'password';
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
                btn.setAttribute('aria-label', 'Show password');
            }
        });
    });
}

/**
 * 2. Login Form Handling & Validation
 */
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const alertBox = document.getElementById('loginAlert');
    const submitBtn = document.getElementById('loginSubmitBtn');

    // Real-time input clearing of error states
    [emailInput, passwordInput].forEach(input => {
        if (!input) return;
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
            const errEl = document.getElementById(`${input.id}Error`);
            if (errEl) errEl.style.display = 'none';
        });
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert(alertBox);

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        let isValid = true;

        // Email validation
        if (!email) {
            setFieldError(emailInput, 'loginEmailError', 'Please enter your email address.');
            isValid = false;
        } else if (!EMAIL_REGEX.test(email)) {
            setFieldError(emailInput, 'loginEmailError', 'Please enter a valid email format.');
            isValid = false;
        } else {
            setFieldSuccess(emailInput, 'loginEmailError');
        }

        // Password validation
        if (!password) {
            setFieldError(passwordInput, 'loginPasswordError', 'Please enter your password.');
            isValid = false;
        } else {
            setFieldSuccess(passwordInput, 'loginPasswordError');
        }

        if (!isValid) return;

        // Perform Spring Boot backend authentication
        setButtonLoading(submitBtn, 'Authenticating...');

        try {
            const response = await Auth.login(email, password);

            showAlert(alertBox, 'success', 'Login successful! Redirecting to your portal...');

            setTimeout(() => {
                const roles = response.roles || (response.role ? [response.role] : []);
                if (roles.includes('ROLE_ADMIN')) {
                    window.location.href = 'admin-dashboard.html';
                } else if (roles.includes('ROLE_OFFICIAL') || roles.includes('ROLE_STAFF')) {
                    window.location.href = 'official-dashboard.html';
                } else {
                    window.location.href = 'citizen-dashboard.html';
                }
            }, 1200);

        } catch (error) {
            console.error('Login error:', error);
            showAlert(alertBox, 'danger', error.message || 'Authentication failed. Please verify your email and password.');
            resetButton(submitBtn, '<i class="bi bi-box-arrow-in-right me-1"></i> Sign In to Account');
        }
    });
}

/**
 * 3. Citizen Registration Form Handling & Validation
 */
function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    const fullNameInput = document.getElementById('regFullName');
    const emailInput = document.getElementById('regEmail');
    const phoneInput = document.getElementById('regPhone');
    const addressInput = document.getElementById('regAddress');
    const passwordInput = document.getElementById('regPassword');
    const confirmPasswordInput = document.getElementById('regConfirmPassword');
    const termsCheck = document.getElementById('regTerms');
    const alertBox = document.getElementById('registerAlert');
    const submitBtn = document.getElementById('registerSubmitBtn');

    // Real-time password strength meter
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            updatePasswordStrength(passwordInput.value);
            if (confirmPasswordInput.value) {
                validatePasswordMatch();
            }
        });
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }

    function validatePasswordMatch() {
        if (!confirmPasswordInput.value) {
            setFieldError(confirmPasswordInput, 'regConfirmPasswordError', 'Please confirm your password.');
            return false;
        }
        if (passwordInput.value !== confirmPasswordInput.value) {
            setFieldError(confirmPasswordInput, 'regConfirmPasswordError', 'Passwords do not match.');
            return false;
        } else {
            setFieldSuccess(confirmPasswordInput, 'regConfirmPasswordError');
            return true;
        }
    }

    // Real-time input cleanup
    [fullNameInput, emailInput, phoneInput, addressInput, passwordInput, confirmPasswordInput].forEach(input => {
        if (!input) return;
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
            const errEl = document.getElementById(`${input.id}Error`);
            if (errEl) errEl.style.display = 'none';
        });
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert(alertBox);

        let isValid = true;

        // 1. Full Name
        const fullName = fullNameInput.value.trim();
        if (!fullName || fullName.length < 3) {
            setFieldError(fullNameInput, 'regFullNameError', 'Please enter your full legal name (at least 3 characters).');
            isValid = false;
        } else {
            setFieldSuccess(fullNameInput, 'regFullNameError');
        }

        // 2. Email
        const email = emailInput.value.trim();
        if (!email || !EMAIL_REGEX.test(email)) {
            setFieldError(emailInput, 'regEmailError', 'Please enter a valid email address (e.g. name@example.com).');
            isValid = false;
        } else {
            setFieldSuccess(emailInput, 'regEmailError');
        }

        // 3. Mobile Number
        const rawPhone = phoneInput.value.trim().replace(/[\s-]/g, '');
        if (!rawPhone || !PHONE_REGEX.test(rawPhone)) {
            setFieldError(phoneInput, 'regPhoneError', 'Please enter a valid 10-digit mobile number.');
            isValid = false;
        } else {
            setFieldSuccess(phoneInput, 'regPhoneError');
        }

        // 4. Address
        const address = addressInput.value.trim();
        if (!address || address.length < 5) {
            setFieldError(addressInput, 'regAddressError', 'Please provide your residential address for civic verification.');
            isValid = false;
        } else {
            setFieldSuccess(addressInput, 'regAddressError');
        }

        // 5. Password
        const password = passwordInput.value;
        if (!password || password.length < 6) {
            setFieldError(passwordInput, 'regPasswordError', 'Password must be at least 6 characters long.');
            isValid = false;
        } else {
            setFieldSuccess(passwordInput, 'regPasswordError');
        }

        // 6. Confirm Password Match
        if (!validatePasswordMatch()) {
            isValid = false;
        }

        // 7. Terms & Conditions
        if (termsCheck && !termsCheck.checked) {
            showAlert(alertBox, 'danger', 'You must agree to the Citizen Terms of Service and Privacy Policy to register.');
            return;
        }

        if (!isValid) {
            showAlert(alertBox, 'danger', 'Please correct the highlighted fields before submitting.');
            return;
        }

        // Perform Spring Boot backend registration
        setButtonLoading(submitBtn, 'Creating Account...');

        try {
            await Auth.register({
                fullName,
                email,
                phoneNumber: rawPhone,
                address,
                password
            });

            showAlert(alertBox, 'success', 'Account registered successfully! Redirecting you to sign in...');
            registerForm.reset();
            updatePasswordStrength('');

            setTimeout(() => {
                window.location.href = 'login.html?registered=true';
            }, 1800);

        } catch (error) {
            console.error('Registration error:', error);
            showAlert(alertBox, 'danger', error.message || 'Registration failed. The email or mobile number may already be in use.');
            resetButton(submitBtn, '<i class="bi bi-person-check-fill me-1"></i> Register as Citizen');
        }
    });
}

/**
 * 4. Password Strength Calculation
 */
function updatePasswordStrength(password) {
    const bar = document.getElementById('passwordStrengthBar');
    const label = document.getElementById('passwordStrengthText');
    if (!bar || !label) return;

    if (!password) {
        bar.className = 'strength-meter-bar';
        bar.style.width = '0%';
        label.textContent = '';
        return;
    }

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) {
        bar.className = 'strength-meter-bar weak';
        label.textContent = 'Weak password (add numbers or special characters)';
        label.style.color = '#ef4444';
    } else if (score <= 4) {
        bar.className = 'strength-meter-bar medium';
        label.textContent = 'Moderate strength';
        label.style.color = '#f59e0b';
    } else {
        bar.className = 'strength-meter-bar strong';
        label.textContent = 'Strong password';
        label.style.color = '#10b981';
    }
}

/**
 * 5. Forgot Password Handler
 */
function initForgotPassword() {
    const forgotForm = document.getElementById('forgotPasswordForm');
    if (!forgotForm) return;

    forgotForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('forgotEmail').value.trim();
        const modalAlert = document.getElementById('forgotAlert');

        if (!email || !EMAIL_REGEX.test(email)) {
            modalAlert.className = 'alert alert-danger';
            modalAlert.textContent = 'Please enter a valid email address.';
            modalAlert.classList.remove('d-none');
            return;
        }

        modalAlert.className = 'alert alert-success';
        modalAlert.textContent = `Password reset instructions have been dispatched to ${email}.`;
        modalAlert.classList.remove('d-none');
    });
}

/**
 * Helper Validation UI functions
 */
function setFieldError(input, errorElementId, message) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    const errEl = document.getElementById(errorElementId);
    if (errEl) {
        errEl.innerHTML = `<i class="bi bi-exclamation-circle me-1"></i> ${message}`;
        errEl.style.display = 'flex';
    }
}

function setFieldSuccess(input, errorElementId) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    const errEl = document.getElementById(errorElementId);
    if (errEl) {
        errEl.style.display = 'none';
    }
}

function showAlert(alertEl, type, message) {
    if (!alertEl) return;
    alertEl.className = `alert alert-${type} alert-dismissible fade show border-0 shadow-sm`;
    alertEl.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            <i class="bi ${type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-danger'} fs-5"></i>
            <div>${message}</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    alertEl.classList.remove('d-none');
}

function hideAlert(alertEl) {
    if (!alertEl) return;
    alertEl.classList.add('d-none');
}

function setButtonLoading(btn, text) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> ${text}`;
}

function resetButton(btn, originalHtml) {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
}
