/* ================================ Important Disclaimer: Use of utilizing scripts * ================================
 *    This "Extract Review Details" userscript automates the collection of data from Amazon Vine review pages, a process akin to web scraping. 
 *    Unlike traditional web scraping, which often involves server-side data extraction for bulk analysis or commercial use, this script 
 *    operates solely within the user's browser, modifying the viewed webpage content without transmitting data externally or impacting Amazon's servers.
 *    
 *    Despite its local operation, please be advised that the utilization of this script is solely at your discretion and risk. I do not assume 
 *    any responsibility for potential actions taken by Amazon against the user utilizing this script. Furthermore, it is important to note that 
 *    this script is the product of an independent developer and does not have any official affiliation with Amazon or the Amazon Vine program.
 * ================================ Important Disclaimer: Use of utilizing scripts * ================================ */

// ==UserScript==
// @name         Extract Review Details
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Enhances the Amazon Vine review process by automatically creating a web-based "spreadsheet" that organizes and extracts Vine orders, reviews, and related details. 
// @author       skyline
// @match        https://www.amazon.com/vine/vine-reviews*
// @match        https://www.amazon.ca/vine/vine-reviews*
// @match        https://www.amazon.co.uk/vine/vine-reviews*
// @match        https://www.amazon.com/vine/vine-reviews?review-type=pending_review
// @match        https://www.amazon.com/vine/vine-reviews?review-type=completed
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
                            background-color: #4CAF50;
                            color: white;
                            cursor: pointer;
                            align-items: center;
                            text-align: center;
                            justify-content: space-between;
                            position: relative;
                            padding-right: 20px;
                        }
                        th.sort-icon:after {
                            content: " \\2195";
                            position: absolute;
                            right: 5px; /* position the icon to the right */
                            top: 50%; /* center vertically */
                            transform: translateY(-50%);
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
                                    <th class="sort-icon">Product Name</th>
                                    <th class="sort-icon">Order Date</th>
                                    <th class="sort-icon">Review Status</th>
                                    <th class="sort-icon">Edit Review Link</th>
                                    <th class="sort-icon">Review Title</th>
                                    <th class="sort-icon">Review Body</th>
                                    <th class="sort-icon">Approved Link</th>
                                    <th class="sort-icon">Product Link</th>
                                </tr>
                            </thead>
                            <tbody>${dataHtml}</tbody>
                        </table>
                    </div>
                    <script>
                    window.onload = function() {
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
                        /* New Copy Button logic (copies hyperlinks)
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
                        // Column Sorting Logic
                        const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;
                        const comparer = (idx, asc) => {
                            // If sorting the "Order Date" column
                            if (idx === 1) {
                                return (a, b) => {
                                    const parseDate = str => {
                                        const parts = str.split('/'); //
                                        return new Date(parts[2], parts[0] - 1, parts[1]); // creates a Date object (MM/DD/YYYY format)
                                    };
                                    const dateA = parseDate(getCellValue(a, idx));
                                    const dateB = parseDate(getCellValue(b, idx));
                                    return (dateA - dateB) * (asc ? 1 : -1);
                                };
                            } else {
                                // logic for other columns
                                return (a, b) => {
                                    const v1 = getCellValue(asc ? a : b, idx);
                                    const v2 = getCellValue(asc ? b : a, idx);
                                    return v1 !== "" && v2 !== "" && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2);
                                };
                            }
                        };
                        document.querySelectorAll('#dataTable th').forEach(th => {
                            th.addEventListener('click', function() {
                                const asc = !this.asc;
                                this.asc = asc; // Toggle the sort direction
                                const table = th.closest('table');
                                const tbody = table.querySelector('tbody');
                                const index = Array.from(th.parentNode.children).indexOf(th);
                                Array.from(tbody.querySelectorAll('tr'))
                                    .sort(comparer(index, asc))
                                    .forEach(tr => tbody.appendChild(tr));
                            });
                        });
                    };
                </script>
            </body>
        </html>
    `);
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
            const reviewStatusElement = row.querySelector('td:nth-child(4)');
            let reviewStatus = reviewStatusElement ? reviewStatusElement.textContent.trim() : "Unknown Status";

            /*  New productName Logic 02/15/24:
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
            const rowHtml = `<tr data-id="${uniqueId}"><td>${productName}</td><td>${orderDate}</td><td>${reviewStatus}</td><td>${editReviewLink}</td><td contenteditable="true" class="editable" data-column="reviewTitle">${reviewTitle}</td><td contenteditable="true" class="editable" data-column="reviewBody">${reviewBody || ''}</td><td>${approvedReviewLink}</td><td>${productLink}</td></tr>`;

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
    window.addEventListener('load', insertButtons, false);
})();