window.Unidex = window.Unidex || {};

(function (ns) {
  ns.modules = ns.modules || {};

  var DEFAULT_FINANCIAL_YEAR_START = "2026-04-01";
  var GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  var PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  var PHONE_PATTERN = /^[0-9]{10}$/;
  var PINCODE_PATTERN = /^[0-9]{6}$/;

  // Admin module owns the business profile that powers invoice headers and GST comparisons.
  function init(app) {
    bindAssetInput(app.elements.companyLogoInput, app.elements.companyLogoDataInput, app.elements.companyLogoPreview, "Add Logo");
    bindAssetInput(app.elements.companySignatureInput, app.elements.companySignatureDataInput, app.elements.companySignaturePreview, "Add Signature");

    app.elements.companyForm.addEventListener("submit", function (event) {
      var company;
      var validationError;

      event.preventDefault();
      company = buildCompanyPayload(app);
      validationError = validateCompany(company);

      if (validationError) {
        setMessage(app, validationError, "error");
        return;
      }

      app.data.company = company;
      app.persist();
      app.renderAll();
      setMessage(app, "Business profile saved successfully.", "success");
    });
  }

  function render(app) {
    fillCompanyForm(app);
    renderSummary(app);
  }

  function fillCompanyForm(app) {
    var company = app.data.company;

    app.elements.companyNameInput.value = company.name || "";
    app.elements.adminCompanyUpi.value = company.upiId || "";
    app.elements.companyGstinInput.value = company.gstin || "";
    app.elements.companyPanInput.value = company.pan || "";
    app.elements.companyPhoneInput.value = company.phone || "";
    app.elements.companyStateSelect.value = company.state || "";
    app.elements.companyPincodeInput.value = company.pincode || "";
    app.elements.companyAddressInput.value = company.address || "";
    app.elements.companyBusinessTypeSelect.value = company.businessType || "Private Limited Company";
    app.elements.companyBusinessCategorySelect.value = company.businessCategory || "Trading";
    app.elements.companyEmailInput.value = company.email || "";
    app.elements.companyFinancialYearStartInput.value = company.financialYearStart || DEFAULT_FINANCIAL_YEAR_START;
    app.elements.companyInvoicePrefixInput.value = company.invoicePrefix || "INV-2026-";
    app.elements.companyLogoDataInput.value = company.logoDataUrl || "";
    app.elements.companySignatureDataInput.value = company.signatureDataUrl || "";

    renderUploadPreview(app.elements.companyLogoPreview, company.logoDataUrl, "Add Logo");
    renderUploadPreview(app.elements.companySignaturePreview, company.signatureDataUrl, "Add Signature");
  }

  function renderSummary(app) {
    app.elements.adminCompanyName.textContent = app.data.company.name || "-";
    app.elements.adminCompanyGstin.textContent = app.data.company.gstin || "-";
    app.elements.adminCompanyState.textContent = app.data.company.state || "-";
  }

  function buildCompanyPayload(app) {
    return {
      name: valueOf("company-name"),
      upiId: valueOf("admin-company-upi"),
      gstin: upperValueOf("company-gstin"),
      pan: upperValueOf("company-pan"),
      phone: valueOf("company-phone"),
      state: app.elements.companyStateSelect.value,
      pincode: valueOf("company-pincode"),
      address: valueOf("company-address"),
      businessType: app.elements.companyBusinessTypeSelect.value,
      businessCategory: app.elements.companyBusinessCategorySelect.value,
      email: valueOf("company-email"),
      financialYearStart: app.elements.companyFinancialYearStartInput.value || DEFAULT_FINANCIAL_YEAR_START,
      invoicePrefix: valueOf("company-invoice-prefix"),
      logoDataUrl: app.elements.companyLogoDataInput.value || "",
      signatureDataUrl: app.elements.companySignatureDataInput.value || ""
    };
  }

  function validateCompany(company) {
    if (!company.name) {
      return "Company name is required.";
    }

    if (!GSTIN_PATTERN.test(company.gstin)) {
      return "GSTIN must be exactly 15 characters in valid format.";
    }

    if (!PAN_PATTERN.test(company.pan)) {
      return "PAN must be exactly 10 characters in valid format.";
    }

    if (!PHONE_PATTERN.test(company.phone)) {
      return "Phone number must be exactly 10 digits.";
    }

    if (!company.state) {
      return "State is required.";
    }

    if (!PINCODE_PATTERN.test(company.pincode)) {
      return "Pincode must be exactly 6 digits.";
    }

    if (!company.address) {
      return "Address is required.";
    }

    if (!company.businessType) {
      return "Business Type is required.";
    }

    if (!company.businessCategory) {
      return "Business Category is required.";
    }

    if (!company.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.email)) {
      return "Enter a valid Email ID.";
    }

    if (!company.financialYearStart) {
      return "Financial Year Start Date is required.";
    }

    if (!company.invoicePrefix) {
      return "Default Invoice Prefix is required.";
    }

    return "";
  }

  function bindAssetInput(fileInput, hiddenInput, previewElement, emptyLabel) {
    fileInput.addEventListener("change", function (event) {
      var file = event.target.files && event.target.files[0];
      var reader;

      if (!file) {
        renderUploadPreview(previewElement, hiddenInput.value, emptyLabel);
        return;
      }

      reader = new FileReader();
      reader.onload = function (loadEvent) {
        hiddenInput.value = String(loadEvent.target.result || "");
        renderUploadPreview(previewElement, hiddenInput.value, emptyLabel);
      };
      reader.readAsDataURL(file);
    });
  }

  // Preview rendering is centralized so both saved data and newly selected files look identical.
  function renderUploadPreview(container, dataUrl, emptyLabel) {
    if (!dataUrl) {
      container.innerHTML = '<span class="upload-card__empty">' + emptyLabel + "</span>";
      return;
    }

    container.innerHTML = '<img src="' + dataUrl + '" alt="' + emptyLabel + ' preview">';
  }

  function setMessage(app, message, type) {
    app.elements.companyFormMessage.textContent = message || "";
    app.elements.companyFormMessage.className = "form-message field-span";

    if (type) {
      app.elements.companyFormMessage.classList.add("form-message--" + type);
    }
  }

  function valueOf(id) {
    return document.getElementById(id).value.trim();
  }

  function upperValueOf(id) {
    return valueOf(id).toUpperCase();
  }

  ns.modules.admin = {
    init: init,
    render: render
  };
})(window.Unidex);
