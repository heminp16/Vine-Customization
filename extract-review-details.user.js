// ==UserScript==
// @name         Extract Review Details
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Enhances the Amazon Vine review process by automatically creating a web-based "spreadsheet" that organizes and extracts Vine orders, reviews, and related details. 
// @author       skyline
// @match        https://www.amazon.com/vine/vine-reviews*
// @match        https://www.amazon.ca/vine/vine-reviews*
// @match        https://www.amazon.co.uk/vine/vine-reviews*
// @match        https://www.amazon.com/vine/vine-reviews?review-type=pending_review
// @match        https://www.amazon.com/vine/vine-reviews?review-type=completed
// @match        https://www.amazon.com/gp/customer-reviews/*
// @match        https://www.amazon.ca/gp/customer-reviews/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @updateURL    https://github.com/heminp16/Vine-Customization/raw/main/extract-review-details.user.js
// @downloadURL  https://github.com/heminp16/Vine-Customization/raw/main/extract-review-details.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Global variable to keep track of the opened data window
    let openedDataWindow = null;

    // Custom buttons for Amazon Vine review page
    function insertButtons() {
        const reviewsLabel = document.querySelector('.vvp-reviews-table--heading-top h3');
        if (!reviewsLabel) return;
        // CSS for tooltips
        const style = document.createElement('style');
        style.innerHTML =
            `.custom-tooltip {
            min-width: auto;
            max-width: auto;
            white-space: nowrap;
            visibility: hidden;
            background-color: black;
            color: white;
            text-align: center;
            border-radius: 6px;
            padding: 5px 10px;
            position: absolute;
            z-index: 1;
            bottom: 120%;
            left: 70%;
            transform: translateX(-50%);
            opacity: 0;
            transition: opacity 0.3s;
        }`
        document.head.appendChild(style);

        // CSS for .a-button-toggle -- Styles buttons to match Vine's a-buttons, w/ a blue highlighted background on click
        const customButtonStyle = document.createElement('style');
        customButtonStyle.innerHTML =
            `.a-button-toggle:hover:focus {
            background-color: transparent;
        }`;
        document.head.appendChild(customButtonStyle);

        // Function to create button with tooltip
        function createButtonWithTooltip(buttonText, tooltipText) {
            const button = document.createElement('button');
            button.style.position = 'relative'; // Button hover location; Above the button
            button.className = 'a-button a-button-toggle';

            // Button text span
            const buttonTextSpan = document.createElement('span');
            buttonTextSpan.className = 'a-button-text';
            buttonTextSpan.innerText = buttonText;
            button.appendChild(buttonTextSpan); // Append the text span to the button

            // Tooltip span
            const tooltip = document.createElement('span');
            tooltip.innerText = tooltipText;
            tooltip.className = 'custom-tooltip';
            tooltip.style.visibility = 'hidden';
            tooltip.style.opacity = '0';
            button.appendChild(tooltip); // Append the tooltip span to the button

            // Event listeners for the tooltip
            button.onmouseover = () => { tooltip.style.visibility = 'visible'; tooltip.style.opacity = '1'; };
            button.onmouseout = () => { tooltip.style.visibility = 'hidden'; tooltip.style.opacity = '0'; };

            reviewsLabel.parentNode.insertBefore(button, reviewsLabel.nextSibling);
            return button;
        }

        // Reset Review Data Button
        const resetButton = createButtonWithTooltip('Reset Review Data', 'Clears all review data and starts from scratch.');
        resetButton.onclick = resetData;
        // Open Review Data Window Button
        const openButton = createButtonWithTooltip('Open Review Data Window', 'Opens the extracted review details in a new tab. Data is stored in local storage for future access.');
        openButton.onclick = openDataWindow;
        // Extract Review Data Button
        const extractButton = createButtonWithTooltip('Extract Review Details', 'Extracts all details from the review table.');
        extractButton.onclick = extractAndSendData;
    }

    // Function to create Filtering / Sorting on Data Window Columns
    function setupFilteringSorting(dataWindow) {
        let currentFilter = {}; // Tracks the current filters applied to columns

        dataWindow.document.addEventListener('click', function(event) {
            // If clicking outside the dropdown, close it
            if (!event.target.classList.contains('filter-button') && !event.target.classList.contains('dynamic-filter-dropdown')) {
                removeExistingDropdown(dataWindow);
            }
        });

        // Sorting Logic
        dataWindow.document.querySelectorAll('.sort-icon').forEach(function(icon) {
            icon.addEventListener('click', function() {
                const th = this.parentNode; // Getting the parent <th> of the sort icon
                const table = th.closest('table');
                const tbody = table.querySelector('tbody');
                const index = Array.from(th.parentNode.children).indexOf(th);
                const asc = th.classList.toggle('asc', !th.classList.contains('asc')); // Toggle ascending sorting

                Array.from(tbody.querySelectorAll('tr'))
                    .sort((a, b) => {
                    // Using a modified comparer function to handle different types of data (text, numbers, dates)
                    const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;
                    const comparer = (idx, asc, a, b) => {
                        let aValue = getCellValue(a, idx);
                        let bValue = getCellValue(b, idx);

                        // Check if values are date strings in a specific format e.g., MM/DD/YYYY
                        if (idx === 1) { // date column
                            const parseDate = str => {
                                const parts = str.split('/');
                                return new Date(parts[2], parts[0] - 1, parts[1]);
                            };
                            aValue = parseDate(aValue);
                            bValue = parseDate(bValue);
                            return asc ? aValue - bValue : bValue - aValue;
                        }

                        // For text and number columns
                        return asc ?
                            isNaN(aValue) || isNaN(bValue) ? aValue.localeCompare(bValue) : aValue - bValue :
                        isNaN(aValue) || isNaN(bValue) ? bValue.localeCompare(aValue) : bValue - aValue;
                    };
                    return comparer(index, asc, a, b);
                })
                    .forEach(tr => tbody.appendChild(tr));
            });
        });

        // Filtering Logic
        dataWindow.document.querySelectorAll('.filter-button').forEach(function(button) {
            button.addEventListener('click', function(event) {
                event.stopPropagation(); // Prevent event bubbling to the sort functionality
                var column = this.getAttribute('data-column');
                // If the filter is already applied, clicking the button again will reset it
                if (currentFilter[column]) {
                    currentFilter[column] = false;
                    filterTable(dataWindow, column, 'All');
                    removeExistingDropdown(dataWindow);
                } else {
                    currentFilter[column] = true; // Set the filter as applied
                    createAndShowFilterDropdown(dataWindow, button, column);
                }
            });
        });
        function createAndShowFilterDropdown(dataWindow, filterButton, column) {
            removeExistingDropdown(dataWindow); // Remove any existing dropdown
            // Create the dropdown element
            var dropdown = dataWindow.document.createElement('select');
            dropdown.className = 'dynamic-filter-dropdown';
            dropdown.setAttribute('data-column', column);
            // Populate dropdown with unique values from the column
            var values = new Set(['All']);
            dataWindow.document.querySelectorAll('#dataTable tbody tr td[data-column="' + column + '"]').forEach(function(td) {
                values.add(td.innerText.trim());
            });
            // Create and append options to dropdown
            values.forEach(function(value) {
                var option = dataWindow.document.createElement('option');
                option.value = value;
                option.innerText = value;
                dropdown.appendChild(option);
            });
            // Setup change event to filter table rows
            dropdown.addEventListener('change', function() {
                filterTable(dataWindow, column, this.value);
            });
            // Append dropdown to body and position it
            dataWindow.document.body.appendChild(dropdown);
            positionDropdownBelowButton(dataWindow, dropdown, filterButton);
        }
        function removeExistingDropdown(dataWindow) {
            var existingDropdown = dataWindow.document.querySelector('.dynamic-filter-dropdown');
            if (existingDropdown) {
                existingDropdown.remove();
            }
        }
        function positionDropdownBelowButton(dataWindow, dropdown, filterButton) {
            var buttonRect = filterButton.getBoundingClientRect();
            dropdown.style.position = 'absolute';
            dropdown.style.left = buttonRect.left + 'px';
            dropdown.style.top = (buttonRect.top + buttonRect.height) + 'px';
            dropdown.style.zIndex = 1000;
        }
        function filterTable(dataWindow, column, value) {
            var rows = dataWindow.document.querySelectorAll('#dataTable tbody tr');
            rows.forEach(function(row) {
                var cellValue = row.querySelector('td[data-column="' + column + '"]').innerText.trim();
                if (value === 'All') {
                    row.style.display = '';
                } else if (cellValue === value) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
    }

    // Function to create the data window with a copy button and sorting feature
    function createDataWindow(dataHtml, userName) {
        const dataWindow = window.open('', 'dataWindow');
        dataWindow.document.write(`
            <html>
                <head>
                    <title>Vine Review Details</title>
                    <link rel="icon" href="https://www.commercerev.com/storage/2020/09/AmazonVineLogo-150x150.png" type="image/x-icon">
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; padding: 20px; }
                        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
                        .header-center { display: flex; align-items: center; justify-content: center; flex-grow: 1; }
                        .header img { height: 50px; margin-right: 10px; }
                        .header-text { font-size: 20px; }
                        .button {
                            background-color: #4CAF50;
                            color: white;
                            padding: 10px 20px;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            transition: background-color 0.3s ease;
                        }
                        .button:hover { background-color: #45a049; }
                        .table-container { overflow-x: auto; }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            background-color: #fff;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            table-layout: fixed;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 8px;
                            text-align: left;
                            word-wrap: break-word; /* ensure content wraps */
                        }
                        th {
                            position: relative;
                            background-color: #4CAF50;
                            color: white;
                            cursor: pointer;
                            align-items: center;
                            text-align: center;
                            justify-content: space-between;
                            padding-right: 20px;
                            white-space: nowrap;
                            padding: 8px;
                        }
                        .sort-icon, .filter-button {
                            position: relative;
                            top: 50%;
                            transform: translateY(-50%);
                        }
                        .sort-icon {
                            left: 0;
                        }
                        .filter-button {
                            right: 0;
                        }
                        .delete-button {
                            background-color: transparent;
                            border: none;
                            padding: 0;
                            cursor: pointer;
                            display: none;
                        }
                        .delete-button svg path.overlay {
                            fill: none;
                            pointer-events: none;
                        }
                        .delete-button:hover svg path.overlay {
                            fill: darkred; /* change color on hover */
                        }
                        td.product-name-cell {
                            position: relative;
                        }
                        tr:hover .delete-button {
                            display: inline-block; /* show on row hover */
                        }
                        tr:nth-child(even){ background-color: #f2f2f2; }
                        tr:hover { background-color: #ddd; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <button id="copyButton" class="button">Copy All Data</button>
                        <div class="header-center">
                            <img src="https://www.commercerev.com/storage/2020/09/AmazonVineLogo-150x150.png" alt="Vine Logo">
                            <div class="header-text">${userName}'s Vine Review Details</div>
                        </div>
                        <div style="width: 130px;"></div>
                    </div>
                    <div class="table-container">
                        <table id="dataTable">
                            <thead>
                                <tr>
                                    <th>
                                        <span class="filter-button" data-column="productName">🔍</span>
                                        Product Name
                                        <span class="sort-icon" data-column="productName">⬍</span>
                                    </th>
                                    <th>
                                        <span class="filter-button" data-column="orderDate">🔍</span>
                                        Order Date
                                        <span class="sort-icon" data-column="orderDate">⬍</span>
                                    </th>
                                    <th>
                                        <span class="filter-button" data-column="reviewStatus">🔍</span>
                                        Review Status
                                        <span class="sort-icon" data-column="reviewStatus">⬍</span>
                                    </th>
                                    <th>
                                        <span class="filter-button" data-column="editReviewLink">🔍</span>
                                        Edit Review Link
                                        <span class="sort-icon" data-column="editReviewLink">⬍</span>
                                    </th>
                                    <th>
                                        <span class="filter-button" data-column="reviewTitle">🔍</span>
                                        Review Title
                                        <span class="sort-icon" data-column="reviewTitle">⬍</span>
                                    </th>
                                    <th>
                                        <span class="filter-button" data-column="reviewBody">🔍</span>
                                        Review Body
                                        <span class="sort-icon" data-column="reviewBody">⬍</span>
                                    </th>
                                    <th>
                                        <span class="filter-button" data-column="approvedReviewLink">🔍</span>
                                        Approved Link
                                        <span class="sort-icon" data-column="approvedReviewLink">⬍</span>
                                    </th>
                                    <th>
                                        <span class="filter-button" data-column="productLink">🔍</span>
                                        Product Link
                                        <span class="sort-icon" data-column="productLink">⬍</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>${dataHtml}</tbody>
                        </table>
                    </div>
                    <script>
                    window.onload = function() {
                        // Delete Button function - updates local storage if row deleted
                        // Keeping the review title/body in local storage for now. Undecided on removal.
                        function updateLocalStorageAfterDelete(rowId) {
                            let dataHtml = localStorage.getItem('extractedData') || '';
                            let parser = new DOMParser();
                            let doc = parser.parseFromString(\`<table>\${dataHtml}</table>\`, 'text/html');
                            const row = doc.querySelector(\`tr[data-id="\${rowId}"]\`);
                            if (row) {
                                row.remove();
                                dataHtml = doc.querySelector('table tbody').innerHTML;
                                localStorage.setItem('extractedData', dataHtml);
                            }
                        }

                        const reviewData = JSON.parse(localStorage.getItem('reviewData')) || {};
                        document.querySelectorAll('#dataTable tr').forEach(row => {
                            const rowId = row.getAttribute('data-id');
                            if (reviewData[rowId]) {
                                const titleCell = row.querySelector('[data-column="reviewTitle"]');
                                const bodyCell = row.querySelector('[data-column="reviewBody"]');
                                if (titleCell && reviewData[rowId].reviewTitle) {
                                    titleCell.innerText = reviewData[rowId].reviewTitle;
                                }
                                if (bodyCell && reviewData[rowId].reviewBody) {
                                    bodyCell.innerText = reviewData[rowId].reviewBody;
                                }
                            }
                        });
                        // Add event listeners to editable cells for saving changes
                        document.querySelectorAll('.editable').forEach(cell => {
                            cell.setAttribute('contenteditable', 'true');
                            cell.addEventListener('blur', function() {
                                const newValue = this.innerText;
                                const rowId = this.closest('tr').getAttribute('data-id');
                                const column = this.getAttribute('data-column');

                                let reviewData = JSON.parse(localStorage.getItem('reviewData')) || {};
                                if (!reviewData[rowId]) {
                                    reviewData[rowId] = {};
                                }
                                reviewData[rowId][column] = newValue;
                                localStorage.setItem('reviewData', JSON.stringify(reviewData));
                            });
                        });
                        // Delete Button logic -> calls function
                        document.querySelectorAll('.delete-button').forEach(button => {
                            button.addEventListener('click', function() {
                                const row = this.closest('tr');
                                row.remove();
                                updateLocalStorageAfterDelete(row.getAttribute('data-id'));
                            });
                        });

                        /* Copy Button logic - copies hyperlinks
                         - Creates a spreadsheet HYPERLINK Formula for links -- best approach.
                         - Works for Google Sheets, Apple Numbers, MS Excel (hyperlink might be colored black, but will be clickable)
                         - Should work for LibreOffice (same syntax), but not tested */
                        document.getElementById("copyButton").addEventListener("click", function() {
                            const el = document.createElement("textarea");
                            el.value = Array.from(document.querySelectorAll("#dataTable tr")).map(tr =>
                                Array.from(tr.querySelectorAll("th, td")).map(td => {
                                    // check if the cell contains a hyperlink
                                    const aTag = td.querySelector("a");
                                    if (aTag) {
                                        // format the cell value as "Text (URL)"
                                        return '=HYPERLINK("' + aTag.href + '", "' + aTag.innerText.replace(/"/g, '""') + '")';
                                    } else {
                                        // replace any double quotes to avoid breaking the formula
                                        return '"' + td.innerText.replace(/"/g, '""') + '"';
                                    }
                                }).join("\\t")
                            ).join("\\n");
                            document.body.appendChild(el);
                            el.select();
                            document.execCommand("copy");
                            document.body.removeChild(el);
                            alert("Data copied to clipboard!");
                        });
                    }
                </script>
            </body>
        </html>
        `);
        // Call the setup for filter dropdowns after the window has loaded
        if (dataWindow.document.readyState === 'complete') {
            setupFilteringSorting(dataWindow);
        } else {
            dataWindow.addEventListener('load', () => setupFilteringSorting(dataWindow));
        }
        dataWindow.document.close();
    }

    // Flag to track if data has been extracted on current page
    function getPageIdentifier() {
        var currentUrl = window.location.href;

        // Extract the domain from the current URL
        var hostname = window.location.hostname; // Ex: www.amazon.com
        var baseUrl = `https://${hostname}/vine/vine-reviews`;

        // Define the Pending/Completed Review URLs.
        // Page 1, can have 3 different links depending on how it is opened, which would mark currentPageIdentifier as different links.
        var pendingReviewsUrls = [
            `${baseUrl}`,
            `${baseUrl}?review-type=pending_review`,
            `${baseUrl}?page=1&review-type=pending_review`
        ];
        var completedReviewsUrls = [
            `${baseUrl}?review-type=completed`,
            `${baseUrl}?page=1&review-type=completed`
        ];
        // Check if the current URL matches the specified URLs
        if (pendingReviewsUrls.includes(currentUrl)) {
            return `${baseUrl}?page=1&review-type=pending_review`;;
        } else if (completedReviewsUrls.includes(currentUrl)) {
            return `${baseUrl}?page=1&review-type=completed`;
        } else {
            // else, return the current URL
            return currentUrl;
        }
    }

    // Extract review data and display it in a new window
    // Main function of this TamperMonkey script (extracts all the Vine Data)
    let asinMatch; // set ASIN from product URLs for identification
    let uniqueId; // set unique identifier (data-id) for reviews; combines ASIN and Order Date
    function extractAndSendData() {
        // Extract the user's name from the Amazon page -- For pop-up window, func createDataWindow
        const userNameSpan = document.getElementById("nav-link-accountList-nav-line-1");
        const userName = userNameSpan ? userNameSpan.textContent.trim().replace("Hello, ", "") : "Viner";

        // Check if data has already been extracted
        const currentPageIdentifier = getPageIdentifier();
        const extractedPages = JSON.parse(localStorage.getItem('extractedPages') || '{}');
        let dataHtml = localStorage.getItem('extractedData') || '';
        let isNewProductData = false; // flag for new products
        let approvedDataUpdated = false; // flag for Approvals tab - If "pending approval" changes to "approved"
        let allNamesValid = true; // flag to track if all product names are valid

        // Iterates over each row to extract data
        let parser = new DOMParser();
        let doc = parser.parseFromString(`<table>${dataHtml}</table>`, 'text/html'); // Wrap dataHtml in <table> for proper parsing
        const rows = document.querySelectorAll('.vvp-reviews-table--row');

        rows.forEach(row => {
            // Setup for both "Pending Reviews" and "Approved Reviews"
            const productLinkElement = row.querySelector('td.vvp-reviews-table--text-col a.a-link-normal');
            const orderDateElement = row.querySelector('td:nth-child(3)');
            const orderDate = orderDateElement ? orderDateElement.textContent.trim() : "Unknown Date";
            const orderTimestamp = orderDateElement ? orderDateElement.dataset.orderTimestamp : "0"; // Fallback to "0" if no timestamp
            const reviewStatusElement = row.querySelector('td:nth-child(4)');
            let reviewStatus = reviewStatusElement ? reviewStatusElement.textContent.trim() : "Unknown Status";

            /*  productName Logic - 02/15/24:
                For some reason, after testing on 2/15/24, there seems to be an error extracting "Product Names"
                Need to throw an error -> tell user to retry extraction */
            let productNameElement = row.querySelector('td.vvp-reviews-table--text-col .a-truncate-full.a-offscreen');
            let productName= "Extract Error";
            if (productNameElement) {
                productName = productNameElement.textContent.trim(); // If exists; This shows entire Product Name
            } else {
                // If product unavailble
                const unavailableText = row.querySelector('td.vvp-reviews-table--text-col .vvp-subtitle-color');
                if (unavailableText && unavailableText.textContent.trim() === "This item is no longer available") {
                    productName = "This item is no longer available";
                }
            }
            // Check if productName is "Error Extract"
            if (productName === "Extract Error") {
                allNamesValid = false; // flag if any product name is "Error Extract"
            }

            /* Setup links and identifiers for reviews:
                - "editReviewLink": Constructs the link for editing pending reviews.
                - "productLink": Generates the direct link to the product page.
                - Global variables "asinMatch" and "uniqueId" used for identifying products and reviews. Works with this script to keep track of manually edited
                  reviews in the Data Window, and for the "Amazon Review Autofill" script.
            */
            let productLink = "Unknown Product" // If product link is not available (Broken link; removed product, etc)
            let editReviewLink;
            if (productLinkElement) {
                // Extracts the ASIN from the product link
                asinMatch = productLinkElement.href.match(/dp\/([A-Z0-9]{10})/);
                if (asinMatch && asinMatch[1]) {
                    productLink = `<a href="${productLinkElement.href}" target="_blank">${asinMatch[1]}</a>`; // if exists, use href from element
                    // Applies for both "Pending Reviews" and "Approved Reviews" -- Extracts the review link every time, whether item is approved or not
                    editReviewLink = `<a href="https://www.amazon.com/review/create-review?encoding=UTF&asin=${asinMatch[1]}" target="_blank">Edit Review: ${asinMatch[1]}</a>`;
                    uniqueId = `review-${asinMatch[1]}-${orderDate.replace(/[^a-zA-Z0-9]/g, '')}`;
                } else {
                    // Fallback if ASIN not found
                    productLink = `<a href="${productLinkElement.href}" target="_blank">Product Link</a>`;
                }
            } else {
                // Extracts ASIN from the text content for Product Link
                asinMatch = row.querySelector('td:nth-child(2)').textContent.match(/([A-Z0-9]{10})/);
                if (asinMatch) {
                    productLink += `. <a href="https://www.amazon.com/dp/${asinMatch[0]}" target="_blank">${asinMatch[0]}</a>`;
                    editReviewLink = `<a href="https://www.amazon.com/review/create-review?encoding=UTF&asin=${asinMatch[0]}" target="_blank">Unknown Product: ${asinMatch[0]}</a>`;
                    uniqueId = `review-${asinMatch[0]}-${orderDate.replace(/[^a-zA-Z0-9]/g, '')}`;
                }
            }

            // Setup for "Approved Reviews"
            const reviewTitleElement = row.querySelector('td[data-review-content]'); // Extract Review Title
            const approvedReviewLinkElement = row.querySelector('a[name="vvp-reviews-table--see-review-btn"]'); // Extract "See Review" Link
            const reviewTitle = reviewTitleElement ? reviewTitleElement.getAttribute('data-review-content') : ""; // Keeping review title as null (only will apply to unreviewed products)

            let reviewBody = null; // Placeholder -- will implement in the future
            let approvedReviewLink;
            if (reviewStatus === null) {
                approvedReviewLink = null; // Keep null if reviewStatus is null
            } else if (reviewStatus === "Unknown Status") {
                approvedReviewLink = "Unknown Link"; // Set to "Unknown Link" if reviewStatus is "Unknown Status"
            } else {
                approvedReviewLink = approvedReviewLinkElement ? `<a href="${approvedReviewLinkElement.href}" target="_blank">See Approved Review</a>` : ""; // Use the link if available
            }

            // Create a table row HTML for a review, including unique ID, product details, review status, links for editing and viewing the review, and editable fields for review title and body.
            const rowHtml = `
            <tr data-id="${uniqueId}" data-order-ts="${orderTimestamp}">
                <td class="product-name-cell" data-column="productName">
                    <button class="delete-button">
                        <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="25" height="25" viewBox="0 0 512 512">
                            <path fill="#E04F5F" d="M504.1,256C504.1,119,393,7.9,256,7.9C119,7.9,7.9,119,7.9,256C7.9,393,119,504.1,256,504.1C393,504.1,504.1,393,504.1,256z"></path>
                            <path fill="#FFF" d="M285,256l72.5-84.2c7.9-9.2,6.9-23-2.3-31c-9.2-7.9-23-6.9-30.9,2.3L256,222.4l-68.2-79.2c-7.9-9.2-21.8-10.2-31-2.3c-9.2,7.9-10.2,21.8-2.3,31L227,256l-72.5,84.2c-7.9,9.2-6.9,23,2.3,31c4.1,3.6,9.2,5.3,14.3,5.3c6.2,0,12.3-2.6,16.6-7.6l68.2-79.2l68.2,79.2c4.3,5,10.5,7.6,16.6,7.6c5.1,0,10.2-1.7,14.3-5.3c9.2-7.9,10.2-21.8,2.3-31L285,256z"></path>
                            <path class="overlay" d="M285,256l72.5-84.2c7.9-9.2,6.9-23-2.3-31c-9.2-7.9-23-6.9-30.9,2.3L256,222.4l-68.2-79.2c-7.9-9.2-21.8-10.2-31-2.3c-9.2,7.9-10.2,21.8-2.3,31L227,256l-72.5,84.2c-7.9,9.2-6.9,23,2.3,31c4.1,3.6,9.2,5.3,14.3,5.3c6.2,0,12.3-2.6,16.6-7.6l68.2-79.2l68.2,79.2c4.3,5,10.5,7.6,16.6,7.6c5.1,0,10.2-1.7,14.3-5.3c9.2-7.9,10.2-21.8,2.3-31L285,256z"></path>
                        </svg>
                    </button>
                    ${productName}
                </td>
                <td data-column="orderDate">${orderDate}</td>
                <td data-column="reviewStatus">${reviewStatus}</td>
                <td data-column="editReviewLink">${editReviewLink}</td>
                <td contenteditable="true" class="editable" data-column="reviewTitle">${reviewTitle}</td>
                <td contenteditable="true" class="editable" data-column="reviewBody">${reviewBody || ''}</td>
                <td data-column="approvedReviewLink">${approvedReviewLink}</td>
                <td data-column="productLink">${productLink}</td>
            </tr>`;

            // Update any new information for the data window; basing off uniqueId to avoid duplicates
            let existingRow = doc.querySelector(`tr[data-id="${uniqueId}"]`);
            if (existingRow) {
                // Get current values
                let currentStatus = existingRow.querySelector('td:nth-child(3)').textContent;
                let currentApprovedLink = existingRow.querySelector('td:nth-child(7)').innerHTML;

                // Check and update reviewStatus if it has changed
                if (currentStatus !== reviewStatus) {
                    existingRow.querySelector('td:nth-child(3)').textContent = reviewStatus; // Updates the status if previously extracted from "Pending" then "Approved"
                    approvedDataUpdated= true;
                }
                // Check and update approvedReviewLink if it has changed
                if (currentApprovedLink !== approvedReviewLink) {
                    existingRow.querySelector('td:nth-child(7)').innerHTML = approvedReviewLink; // Updates the link if missing before
                    approvedDataUpdated= true;
                }          
            } else {
                // If no existing row, append new data
                let tbody = doc.querySelector('table').querySelector('tbody') || doc.querySelector('table');
                tbody.insertAdjacentHTML('beforeend', rowHtml);
                isNewProductData = true;
            }
        });

        // Sort the table rows by the 'data-order-ts' attribute after processing all rows
        const sortedRows = Array.from(doc.querySelectorAll('tr')).sort((a, b) => a.getAttribute('data-order-ts') - b.getAttribute('data-order-ts'));
        const tbody = doc.querySelector('table').querySelector('tbody') || doc.querySelector('table');
        tbody.innerHTML = ''; // Clear existing rows
        sortedRows.forEach(row => tbody.appendChild(row)); // Append sorted rows

        dataHtml = doc.querySelector('table tbody').innerHTML;

        // Updates local storage if new data is found
        if (isNewProductData && allNamesValid || approvedDataUpdated) {
            // Close the previously opened data window if it exists
            if (openedDataWindow && !openedDataWindow.closed) {
                openedDataWindow.close();
            }
            localStorage.setItem('extractedData', dataHtml);
            createDataWindow(dataHtml, userName);
            extractedPages[currentPageIdentifier] = true; // Marks the current page as extracted
            localStorage.setItem('extractedPages', JSON.stringify(extractedPages));
        } else if (!allNamesValid) {
            alert(`One or more product names could not be extracted. Please retry. If the error persists, scroll through the page and then press the button.`);
        } else { // checks if no new data found
            alert("Data already extracted; no new data found for this page. Please press the 'Open Review Data Window' button to view existing data.");

        }
    }

    function openDataWindow() {
        const dataHtml = localStorage.getItem('extractedData') || '';
        // Extract the user's name from the Amazon page -- For pop-up window, param for function createDataWindow
        const userNameSpan = document.getElementById("nav-link-accountList-nav-line-1");
        const userName = userNameSpan ? userNameSpan.textContent.trim().replace("Hello, ", "") : "Viner";
        createDataWindow(dataHtml, userName);
    }

    // Resets the extracted data in local storage
    function resetData() {
        localStorage.removeItem('extractedData');
        localStorage.removeItem('extractedPages'); // Reset page tracking

        // Comment out the code line below to keep manually entered "Review Title" and "Review Body" in local storage. -- Beneficial if editing code / debugging
        localStorage.removeItem('reviewData') // Removes the manually edited "Review Title" and "Review Body"

        // Close the previously opened data window if it exists
        if (openedDataWindow && !openedDataWindow.closed) {
            // Update the content of the opened data window to show that data has been reset
            openedDataWindow.document.body.innerHTML = '<p>All review data has been reset.</p>';
            alert('All review data has been reset.');
        } else {
            // If the data window was not open, open a new one to show the reset message
            openedDataWindow = window.open('', 'dataWindow');
            openedDataWindow.document.write('<html><head><title>Data Cleared</title><link rel="icon" href="https://www.commercerev.com/storage/2020/09/AmazonVineLogo-150x150.png" type="image/x-icon"></head><body>');
            openedDataWindow.document.write('<p>All review data has been reset.</p>');
            openedDataWindow.document.write('</body></html>');
            openedDataWindow.document.close();
        }
    }

    // Faster buttons load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertButtons);
    } else {
        insertButtons();
    }

    // Function to extract Approved Review Body from "www.amazon.com/gp/customer-reviews/*"
    // Cannot extract from the Vine portal, therefore, added a button to this page to help complete the Web Spreadsheet
    function extractApprovedReviewBody() {
        // Function to add button next to "Customer Review"
        function addExtractReviewBodyButton() {
            const addButton = () => {
                const customerReviewHeading = document.getElementById('cr-customer-review');

                if (customerReviewHeading) {
                    const flexContainer = document.createElement('div');
                    flexContainer.style.display = 'flex';
                    flexContainer.style.alignItems = 'center';

                    const button = document.createElement('button');
                    button.textContent = 'Extract and Save Review Body';
                    // set button styles
                    button.style.backgroundColor = '#4CAF50';
                    button.style.color = 'white';
                    button.style.padding = '10px 20px';
                    button.style.marginLeft = '20px';
                    button.style.border = 'none';
                    button.style.borderRadius = '5px';
                    button.style.cursor = 'pointer';
                    button.style.transition = 'background-color 0.3s ease';

                    button.onclick = extractReviewBodyAndSave;
                    // set event listeners
                    button.addEventListener('mouseover', () => {
                        if (!button.disabled) { // only change color if the button is not disabled
                            button.style.backgroundColor = '#45a049';
                        }
                    });
                    button.addEventListener('mouseout', () => {
                        if (!button.disabled) { // revert color only if the button is not disabled
                            button.style.backgroundColor = '#4CAF50';
                        }
                    });
                    customerReviewHeading.parentNode.insertBefore(flexContainer, customerReviewHeading);
                    flexContainer.appendChild(customerReviewHeading);
                    flexContainer.appendChild(button);
                }
            };
            // try to add the button immediately if the element exists, else wait for DOMContentLoaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', addButton);
            } else {
                addButton();
            }
        }
        // Function to extract the review body and update it in local storage
        function extractReviewBodyAndSave() {
            const stateObject = document.getElementById('cr-state-object'); // Extract ASIN from the page
            let asin = '';
            if (stateObject && stateObject.dataset.state) {
                const state = JSON.parse(stateObject.dataset.state);
                asin = state.asin;
            }
            if (!asin) {
                alert('Error: ASIN not found. Please try refreshing, or may need to manually copy-paste.');
                return;
            }
            // Extract review body text
            const reviewBodyText = document.querySelector('span[data-hook="review-body"]').textContent.trim();
            let dataHtml = localStorage.getItem('extractedData') || ''; // get existing data from local storage
            // Parse the existing HTML to find the correct place to update the review body
            let parser = new DOMParser();
            let doc = parser.parseFromString(`<table>${dataHtml}</table>`, 'text/html');
            console.log(doc)

            // Update row that match the ASIN; ignores the Order Date, not available (but should be fine)
            const rowsToUpdate = doc.querySelectorAll(`tr[data-id^="review-${asin}-"]`);
            console.log(rowsToUpdate)
            let found = false;

            rowsToUpdate.forEach(row => {
                let reviewBodyCell = row.querySelector('td[data-column="reviewBody"]');
                if (reviewBodyCell) {
                    reviewBodyCell.textContent = reviewBodyText; // Update the review body text
                    found = true;
                }
            });
            if (found) {
                // Update local storage
                dataHtml = doc.querySelector('table tbody').innerHTML;
                localStorage.setItem('extractedData', dataHtml);
                // Disable the button and show a check mark
                this.textContent = '✓ Review Body Saved'; // Update button text to include a check mark
                this.disabled = true; // Disable the button
                this.style.backgroundColor = '#6da9c9';
            } else {
                alert('No matching review entry found for the ASIN in local storage.');
            }
        }
        // Add the button when the script runs
        addExtractReviewBodyButton();
    }
    extractApprovedReviewBody();
})();