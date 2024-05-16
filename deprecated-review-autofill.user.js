// ==UserScript==
// @name         Deprecated - Amazon Review Autofill
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  (Deprecated) Autofill Amazon reviews based on ASIN and review data from local storage (Requires "Extract Review Data" script installed). Note: The automated portion requires manual interaction as well.
// @author       skyline
// @match        *://www.amazon.com/review/create-review?*
// @match        *://www.amazon.ca/review/create-review?*
// @match        *://www.amazon.co.uk/review/create-review?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @updateURL    https://github.com/heminp16/Vine-Customization/raw/main/deprecated-review-autofill.user.js
// @downloadURL  https://github.com/heminp16/Vine-Customization/raw/main/deprecated-review-autofill.user.js
// @grant        none
// ==/UserScript==

/* ===================================================================================================
 *                                 Amazon Review Autofill (Deprecated)                           
 * ===================================================================================================
 *                               IMPORTANT INFORMATION (READ CAREFULLY)
 * ===================================================================================================
 * This script has now been deprecated. The current script made it appear as if the content was written,
 * but upon submission, errors would arise (indicating that the review title and body were not filled out).
 * This script would not be deemed "bot activity" as it requires the user to manually click into the Review
 * Title and Body and enter a space for it to recognize the contents.
 *
 * This script will no longer be updated. The new script "review-autofill.user.js" is available to download,
 * but it could be considered bot activity. Unlikely, but possible.
 * ===================================================================================================
 *                                          Script Breakdown
 * ===================================================================================================
 *                       This userscript automates the process of filling out reviews
 *              based on review data stored in the browser's local storage (from my other script).
 *
 * =============================== Key functionalities include: * ====================================
 * 1. Handling Review Titles: If the 'reviewTitle' from the review data lacks a leading rating
 *    (e.g., "5;Great Product"), the script will skip setting a star rating and treat the 
 *    'reviewTitle' as the title text without attempting to click any star rating.
 *
 * 2. Autofilling Review Fields: Automatically populates the review title and body fields with the
 *    data retrieved from local storage. If a rating is written (preceding the title in 'reviewTitle'),
 *    it will also set the corresponding star rating.
 *
 * 3. Randomized Click Intervals for Ratings: To more closely mimic human behavior and reduce the
 *    likelihood of detection by automated systems, clicks on star ratings are executed with random
 *    delays ranging between 500ms and 1000ms.
 * =================================================================================================== */

(function() {
    'use strict';

    function getReviewData() {
        const reviewDataString = localStorage.getItem('reviewData');
        try {
            return JSON.parse(reviewDataString);
        } catch (e) {
            console.error('Error parsing reviewData from local storage:', e);
            return null;
        }
    }

    function getASINFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const asin = urlParams.get('asin');
        return asin;
    }

    function findReviewDataForASIN(reviewData, asin) {
        const reviewDataKey = Object.keys(reviewData).find(key => key.includes(asin));
        return reviewDataKey ? reviewData[reviewDataKey] : null;
    }

    function insertInputBoxAndButton() {
        const container = document.querySelector('.ryp__review-form');
        if (container) {
            // Create a flex container for the input box and submit button
            const flexContainer = document.createElement('div');
            flexContainer.style.display = 'flex';
            flexContainer.style.alignItems = 'center';
            flexContainer.style.marginBottom = '20px';

            // Create the input box
            const inputBox = document.createElement('input');
            inputBox.type = 'text';
            inputBox.id = 'tm-autofill-input';
            inputBox.placeholder = 'Enter in the format: Title;Body or Rating;Title;Body';
            inputBox.style.flexGrow = '1';
            inputBox.style.height = '40px';
            inputBox.style.marginRight = '15px';

            // Create the duplicate submit button
            const submitButtonWrapper = document.createElement('span');
            submitButtonWrapper.style.marginLeft = '0px';
            submitButtonWrapper.style.marginRight = '15px';
            submitButtonWrapper.innerHTML = `
            <span data-hook="ryp-review-submit-button" class="a-button a-button-normal a-button-primary">
                <span class="a-button-inner">
                    <button class="a-button-text" type="button">Submit</button>
                </span>
            </span>`;

            // Append the input box and submit button to the flex container
            flexContainer.appendChild(inputBox);
            flexContainer.appendChild(submitButtonWrapper);

            // Insert the flex container before the first child of the form container
            container.insertBefore(flexContainer, container.firstChild);

            inputBox.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const value = inputBox.value.split(';');
                    let rating, title, body;

                    if (value.length === 3) {
                        // Format: Rating;Title;Body
                        [rating, title, body] = value;
                    } else if (value.length === 2) {
                        // Format: Title;Body -  No rating provided
                        [title, body] = value;
                        rating = ""; // No rating provided
                    } else {
                        // Incorrect format
                        alert('Please enter the information in the correct format. For just title and body: Title;Body. For rating, title, and body: Rating;Title;Body.');
                        return; // Exit the function to prevent further execution
                    }

                    autofillReview(rating, title, body);
                    e.preventDefault();
                }
            });

            // Automatically fill the form if data is available
            const reviewData = getReviewData();
            if (reviewData) {
                const asin = getASINFromURL();
                const specificReviewData = findReviewDataForASIN(reviewData, asin);
                if (specificReviewData && specificReviewData.reviewTitle) {
                    const reviewTitle = specificReviewData.reviewTitle;
                    const reviewBody = specificReviewData.reviewBody || "";
                    let rating, title;

                    if (reviewTitle.includes(';')) {
                        [rating, title] = reviewTitle.split(';');
                    } else {
                        title = reviewTitle; // No rating given, only title is present
                        rating = ""; // Default or placeholder rating if needed
                    }

                    autofillReview(rating, title, reviewBody);
                }
            }
            // Event listener for the custom submit button
            submitButtonWrapper.querySelector('.a-button-text').addEventListener('click', function() {
                // mimic clicking the original submit button or directly submitting the form
                const originalSubmitButton = document.querySelector('.ryp__submit-button-card__card-frame .a-button-text');
                if (originalSubmitButton) {
                    originalSubmitButton.click();
                }
            });
        }
    }
    function autofillReview(rating, title, body) {
        // Set the title
        const titleInput = document.getElementById('scarface-review-title-label');
        if (titleInput) {
            titleInput.value = title;
        }
        // Set the body
        const bodyTextArea = document.getElementById('scarface-review-text-card-title');
        if (bodyTextArea) {
            bodyTextArea.value = body + "\n";
        }
        // Only attempt to set the star rating if a rating is given
        if (rating) {
            const starRatingButtons = document.querySelectorAll('.ryp__star__button');
            const ratingIndex = parseInt(rating, 10) - 1;
            if (!isNaN(ratingIndex) && starRatingButtons && starRatingButtons.length > ratingIndex) {

                // Calculate the delay
                const delay = Math.random() * (1000 - 500) + 500; // Delay between 500ms and 1000ms
                // log to console. -- can comment out if wanted
                console.log(`Setting star rating with a delay of ${delay} milliseconds.`);
            
                // Delay to simulate human interaction
                setTimeout(() => starRatingButtons[ratingIndex].click(), delay);
            }
        }
    }
    window.addEventListener('load', function() {
        insertInputBoxAndButton();
    });
})();