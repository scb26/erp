window.Unidex = window.Unidex || {};

(function (ns) {
  ns.modules = ns.modules || {};

  var DEFAULT_FINANCIAL_YEAR_START = "2026-04-01";
  var GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  var PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  var PHONE_PATTERN = /^[0-9]{10}$/;
  var PINCODE_PATTERN = /^[0-9]{6}$/;

  var currentStep = 1;

  function init(app) {
    if (!app.data.company || !app.data.company.name) {
       console.log("Admin module: Company profile not found. Form will be empty.");
    }

    bindAssetInput(app.elements.companyLogoInput, app.elements.companyLogoDataInput, app.elements.companyLogoPreview, "Add Logo", function() {
      updateLivePreview(app);
    });
    bindAssetInput(app.elements.companySignatureInput, app.elements.companySignatureDataInput, app.elements.companySignaturePreview, "Add Signature");

    // Live preview updates
    app.elements.companyForm.addEventListener("input", function() {
      updateLivePreview(app);
    });

    // Wizard Navigation
    app.elements.btnWizardNext.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var nextStep = parseInt(btn.dataset.next, 10);
        var err = validateCurrentStep(currentStep, app);
        if (err) {
          setMessage(app, err, "error");
          return;
        }
        setMessage(app, "", ""); // clear error
        
        // Auto-save draft
        saveDraft(app);
        
        showStep(nextStep, app);
      });
    });

    app.elements.btnWizardBack.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var backStep = parseInt(btn.dataset.back, 10);
        setMessage(app, "", ""); // clear error
        showStep(backStep, app);
      });
    });

    if (app.elements.btnWizardSkip) {
      app.elements.btnWizardSkip.addEventListener("click", function() {
        saveBusinessProfile(app);
      });
    }

    // Form Submit
    app.elements.companyForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var err = validateCurrentStep(currentStep, app);
      if (err) {
        setMessage(app, err, "error");
        return;
      }
      saveBusinessProfile(app);
    });

    // API Fetches
    if (app.elements.btnFetchPincode) {
      app.elements.btnFetchPincode.addEventListener("click", function() {
        fetchPincode(app);
      });
    }
    
    if (app.elements.btnFetchGstin) {
      app.elements.btnFetchGstin.addEventListener("click", function() {
        fetchGstinPlaceholder(app);
      });
    }

    // Admin Tabs — wire up the global toolbar buttons that carry data-admin-tab
    function bindAdminTabs() {
      var adminTabBtns = document.querySelectorAll('#module-menu [data-admin-tab]');
      adminTabBtns.forEach(function(btn) {
        btn.addEventListener("click", function() {
          var tabId = btn.dataset.adminTab;

          adminTabBtns.forEach(function(b) { b.classList.remove("is-active"); });
          btn.classList.add("is-active");

          var profileTab = document.getElementById("admin-tab-profile");
          var configTab  = document.getElementById("admin-tab-config");

          if (tabId === "profile") {
            if (profileTab) profileTab.style.display = "block";
            if (configTab)  configTab.style.display  = "none";
          } else {
            if (profileTab) profileTab.style.display = "none";
            if (configTab)  configTab.style.display  = "block";
          }
        });
      });
    }

    // Tabs may not exist on first init (navigation hasn't rendered them yet),
    // so we also expose bindAdminTabs so erp.js can call it after module switch.
    bindAdminTabs();
    app._bindAdminTabs = bindAdminTabs;

    // Reset step
    currentStep = 1;
  }

  function showStep(step, app) {
    currentStep = step;
    
    app.elements.wizardSteps.forEach(function(el) {
      el.classList.toggle("is-active", parseInt(el.dataset.step, 10) === step);
    });

    app.elements.wizardIndicators.forEach(function(el) {
      var indStep = parseInt(el.dataset.indicator, 10);
      el.classList.toggle("is-active", indStep === step);
      if (indStep < step) {
        el.classList.add("is-completed");
      } else {
        el.classList.remove("is-completed");
      }
    });
  }

  function saveDraft(app) {
    var company = buildCompanyPayload(app);
    app.data.company = Object.assign({}, app.data.company || {}, company);
    app.persist();
  }

  function saveBusinessProfile(app) {
    var company = buildCompanyPayload(app);
    app.data.company = company;
    app.persist();
    app.renderAll();
    
    if (ns.utils && ns.utils.showToast) {
      ns.utils.showToast("Business setup saved successfully!", "success");
    }
    setMessage(app, "Business profile saved successfully.", "success");
  }

  function validateCurrentStep(step, app) {
    var c = buildCompanyPayload(app);
    
    if (step === 1) {
      if (!c.name) return "Business Name is required.";
      if (c.gstin && !GSTIN_PATTERN.test(c.gstin)) return "GSTIN must be 15 characters if provided.";
      if (c.pan && !PAN_PATTERN.test(c.pan)) return "PAN must be 10 characters if provided.";
    } 
    else if (step === 2) {
      if (!c.phone || !PHONE_PATTERN.test(c.phone)) return "Valid 10-digit Mobile Number is required.";
      if (!c.pincode || !PINCODE_PATTERN.test(c.pincode)) return "Valid 6-digit Pincode is required.";
      if (!c.city) return "City is required.";
      if (!c.state) return "State is required.";
      if (!c.address) return "Address Line 1 is required.";
      if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) return "Enter a valid Email ID.";
    }
    else if (step === 3) {
      if (!c.invoicePrefix) return "Invoice Prefix is required.";
      if (!c.financialYearStart) return "Financial Year Start is required.";
    }
    
    return "";
  }

  function fetchPincode(app) {
    var pincode = document.getElementById("company-pincode").value.trim();
    if (!PINCODE_PATTERN.test(pincode)) {
      if (ns.utils && ns.utils.showToast) ns.utils.showToast("Enter a valid 6-digit pincode first.");
      return;
    }
    
    app.elements.btnFetchPincode.textContent = "Fetching...";
    app.elements.btnFetchPincode.disabled = true;

    fetch("https://api.postalpincode.in/pincode/" + pincode)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
          var po = data[0].PostOffice[0];
          document.getElementById("company-city").value = po.District || po.Block || po.Region;
          document.getElementById("company-state").value = po.State;
          if (ns.utils && ns.utils.showToast) ns.utils.showToast("City & State auto-filled!", "success");
        } else {
          if (ns.utils && ns.utils.showToast) ns.utils.showToast("Pincode not found.");
        }
      })
      .catch(function(err) {
        console.error("Pincode API Error", err);
        if (ns.utils && ns.utils.showToast) ns.utils.showToast("Failed to fetch Pincode.");
      })
      .finally(function() {
        app.elements.btnFetchPincode.textContent = "Auto-fill";
        app.elements.btnFetchPincode.disabled = false;
        updateLivePreview(app);
      });
  }

  function fetchGstinPlaceholder(app) {
    var gstin = document.getElementById("company-gstin").value.trim().toUpperCase();
    if (!GSTIN_PATTERN.test(gstin)) {
      if (ns.utils && ns.utils.showToast) ns.utils.showToast("Enter a valid 15-character GSTIN first.");
      return;
    }
    
    app.elements.btnFetchGstin.textContent = "Wait...";
    app.elements.btnFetchGstin.disabled = true;

    setTimeout(function() {
      // Mock Data
      document.getElementById("company-name").value = "Demo Business " + gstin.substring(0, 2);
      document.getElementById("company-pan").value = gstin.substring(2, 12);
      
      app.elements.btnFetchGstin.textContent = "Fetch";
      app.elements.btnFetchGstin.disabled = false;
      if (ns.utils && ns.utils.showToast) ns.utils.showToast("GSTIN details fetched successfully!", "success");
      updateLivePreview(app);
    }, 1000);
  }

  function render(app) {
    fillCompanyForm(app);
    showStep(1, app);
    updateLivePreview(app);
  }

  function fillCompanyForm(app) {
    var company = app.data.company || {}; 

    if (app.elements.companyNameInput) app.elements.companyNameInput.value = company.name || "";
    if (app.elements.companyTradeNameInput) app.elements.companyTradeNameInput.value = company.tradeName || "";
    if (app.elements.companyGstinInput) app.elements.companyGstinInput.value = company.gstin || "";
    if (app.elements.companyPanInput) app.elements.companyPanInput.value = company.pan || "";
    if (app.elements.companyPhoneInput) app.elements.companyPhoneInput.value = company.phone || "";
    if (app.elements.companyAltPhoneInput) app.elements.companyAltPhoneInput.value = company.altPhone || "";
    
    var stateEl = document.getElementById("company-state");
    if (stateEl) stateEl.value = company.state || "";
    
    if (app.elements.companyPincodeInput) app.elements.companyPincodeInput.value = company.pincode || "";
    if (app.elements.companyCityInput) app.elements.companyCityInput.value = company.city || "";
    
    if (app.elements.companyAddressInput) app.elements.companyAddressInput.value = company.address || "";
    if (app.elements.companyAddressLine2Input) app.elements.companyAddressLine2Input.value = company.addressLine2 || "";
    
    if (app.elements.companyBusinessTypeSelect) app.elements.companyBusinessTypeSelect.value = company.businessType || "Private Limited Company";
    if (app.elements.companyBusinessCategorySelect) app.elements.companyBusinessCategorySelect.value = company.businessCategory || "Trading";
    if (app.elements.companyEmailInput) app.elements.companyEmailInput.value = company.email || "";
    if (app.elements.companyWebsiteInput) app.elements.companyWebsiteInput.value = company.website || "";
    
    if (app.elements.companyFinancialYearStartInput) app.elements.companyFinancialYearStartInput.value = company.financialYearStart || DEFAULT_FINANCIAL_YEAR_START;
    if (app.elements.companyInvoicePrefixInput) app.elements.companyInvoicePrefixInput.value = company.invoicePrefix || "INV-2026-";
    
    if (app.elements.companyUpiInput) app.elements.companyUpiInput.value = company.upiId || "";
    
    if (app.elements.companyBankHolderInput) app.elements.companyBankHolderInput.value = company.bankHolder || "";
    if (app.elements.companyBankAccountInput) app.elements.companyBankAccountInput.value = company.bankAccount || "";
    if (app.elements.companyBankIfscInput) app.elements.companyBankIfscInput.value = company.bankIfsc || "";
    if (app.elements.companyBankNameInput) app.elements.companyBankNameInput.value = company.bankName || "";

    if (app.elements.companyLogoDataInput) app.elements.companyLogoDataInput.value = company.logoDataUrl || "";
    if (app.elements.companySignatureDataInput) app.elements.companySignatureDataInput.value = company.signatureDataUrl || "";

    renderUploadPreview(app.elements.companyLogoPreview, company.logoDataUrl, "Add Logo");
    renderUploadPreview(app.elements.companySignaturePreview, company.signatureDataUrl, "Add Signature");
  }

  function buildCompanyPayload(app) {
    return {
      name: valueOf("company-name"),
      tradeName: valueOf("company-trade-name"),
      upiId: valueOf("admin-company-upi"),
      gstin: upperValueOf("company-gstin"),
      pan: upperValueOf("company-pan"),
      phone: valueOf("company-phone"),
      altPhone: valueOf("company-alt-phone"),
      state: valueOf("company-state"),
      city: valueOf("company-city"),
      pincode: valueOf("company-pincode"),
      address: valueOf("company-address"),
      addressLine2: valueOf("company-address-line2"),
      businessType: valueOf("company-business-type"),
      businessCategory: valueOf("company-business-category"),
      email: valueOf("company-email"),
      website: valueOf("company-website"),
      financialYearStart: valueOf("company-financial-year-start") || DEFAULT_FINANCIAL_YEAR_START,
      invoicePrefix: valueOf("company-invoice-prefix"),
      
      bankHolder: valueOf("company-bank-holder"),
      bankAccount: valueOf("company-bank-account"),
      bankIfsc: upperValueOf("company-bank-ifsc"),
      bankName: valueOf("company-bank-name"),

      logoDataUrl: valueOf("company-logo-data"),
      signatureDataUrl: valueOf("company-signature-data")
    };
  }
  
  function updateLivePreview(app) {
    var c = buildCompanyPayload(app);
    
    if (app.elements.previewLiveBrand) app.elements.previewLiveBrand.textContent = c.tradeName || c.name || "Your Business Name";
    if (app.elements.previewLiveGstin) app.elements.previewLiveGstin.textContent = c.gstin || "-";
    if (app.elements.previewLivePan) app.elements.previewLivePan.textContent = c.pan || "-";
    if (app.elements.previewLivePhone) app.elements.previewLivePhone.textContent = c.phone || "-";
    if (app.elements.previewLiveEmail) app.elements.previewLiveEmail.textContent = c.email || "-";
    
    if (app.elements.previewLiveAddress) {
       var addrParts = [];
       if (c.address) addrParts.push(c.address);
       if (c.addressLine2) addrParts.push(c.addressLine2);
       
       var line2 = "";
       if (c.city) line2 += c.city;
       if (c.state) line2 += (line2 ? ", " : "") + c.state;
       if (c.pincode) line2 += " - " + c.pincode;
       
       if (line2) addrParts.push(line2);
       
       app.elements.previewLiveAddress.innerHTML = addrParts.length > 0 ? addrParts.join("<br>") : "Address will appear here.<br>City, State - Pincode";
    }
    
    if (app.elements.previewLiveLogo) {
      if (c.logoDataUrl) {
        app.elements.previewLiveLogo.src = c.logoDataUrl;
        app.elements.previewLiveLogo.style.display = "block";
      } else {
        app.elements.previewLiveLogo.style.display = "none";
      }
    }
  }

  function bindAssetInput(fileInput, hiddenInput, previewElement, emptyLabel, onChangeCallback) {
    if (!fileInput) return;
    fileInput.addEventListener("change", function (event) {
      var file = event.target.files && event.target.files[0];
      var reader;

      if (!file) {
        renderUploadPreview(previewElement, hiddenInput.value, emptyLabel);
        if (onChangeCallback) onChangeCallback();
        return;
      }

      reader = new FileReader();
      reader.onload = function (loadEvent) {
        hiddenInput.value = String(loadEvent.target.result || "");
        renderUploadPreview(previewElement, hiddenInput.value, emptyLabel);
        if (onChangeCallback) onChangeCallback();
      };
      reader.readAsDataURL(file);
    });
  }

  function renderUploadPreview(container, dataUrl, emptyLabel) {
    if (!container) return;
    if (!dataUrl) {
      container.innerHTML = '<span class="upload-card__empty">' + emptyLabel + "</span>";
      return;
    }
    container.innerHTML = '<img src="' + dataUrl + '" alt="' + emptyLabel + ' preview">';
  }

  function setMessage(app, message, type) {
    if (!app.elements.companyFormMessage) return;
    app.elements.companyFormMessage.textContent = message || "";
    app.elements.companyFormMessage.className = "form-message field-span";

    if (type) {
      app.elements.companyFormMessage.classList.add("form-message--" + type);
    }
  }

  function valueOf(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function upperValueOf(id) {
    return valueOf(id).toUpperCase();
  }

  ns.modules.admin = {
    init: init,
    render: render
  };
})(window.Unidex);
