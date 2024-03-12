
# Enhance Vine Reviews
A web-based "spreadsheet" designed to enhance the Amazon Vine review process, along with an autofill script to streamline and improve the reviewing experience. Please read the disclaimer before installation.

# Table of Contents
- [Extract Review Details](#extract-review-details)
    - [Demo of Extract Review Details](#demo-of-extract-review-details)
- [Amazon Review Autofill - Manual/Automatic](#amazon-review-autofill---manualautomatic)
  - [Demo of Amazon Review Autofill](#demo-of-amazon-review-autofill)
- [Installation](#installation-guide)
- [Feedback](#feedback)

# Extract Review Details

## Disclaimer:
This "Extract Review Details" userscript automates the collection of data from Amazon Vine review pages, a process akin to web scraping. Unlike traditional web scraping, which often involves server-side data extraction for bulk analysis or commercial use, this script operates solely within the user's browser, modifying the viewed webpage content without transmitting data externally or impacting Amazon's servers.

Despite its local operation, please be advised that the utilization of this script is solely at your discretion and risk. I do not assume any responsibility for potential actions taken by Amazon against the user utilizing this script. Furthermore, it is important to note that this script is the product of an independent developer and does not have any official affiliation with Amazon or the Amazon Vine program.

---
## Write-Up
This script is designed to make managing Amazon Vine reviews easier and more efficient. It automates the extraction of review details directly within the browser, allowing for a spreadsheet-like management without the spreadsheet. 

Features include:
- **Custom Buttons**: Adds buttons on the Amazon Vine review pages for various tasks such as extracting review details, opening the review data window, and resetting review data.
- **Data Extraction**: Automates the collection of information like product names, order dates, review statuses, and links for editing or viewing reviews.
- **Editable Data**: Enables users to edit the "Review Title" and "Review Body" directly in the browser, with changes saved to local storage.
- **Data Management**: Streamlines the process of gathering and organizing review information, including for items that may no longer be available This feature provides options to clear stored data or display it in a new window for easy access.
- **Local Storage**: Uses the browser's local storage to save extracted and edited review data, ensuring that data is not lost between sessions.     
  **Note**: Please be aware that if you switch between two computers, the stored data will not synchronize across both devices.

## Demo of Extract Review Details
![demo_of_extract_review_details](https://github.com/heminp16/Vine-Customization/assets/88010681/af35eace-57d2-4e75-b2d3-4f72033999f5)


# Amazon Review Autofill - Manual/Automatic

## Disclaimer:
Using automated scripts on Amazon's website may violate their terms of service, potentially leading to actions against your account. It is recommended to manually select star ratings when possible to minimize risks. I do not assume any responsibility for potential actions taken by Amazon against the user utilizing this script.

This script simplifies the review-writing process by autofilling the review form on Amazon with previously stored data or manual input. It is designed to work along with the "Extract Review Details" script but also supports standalone use.

---
## Write-Up
This script simplifies the review-writing process by autofilling the review form on Amazon with previously stored data or manual input. It is designed to work along with the "Extract Review Details" script but also supports standalone use.

Features include:
- **Automatic Data Retrieval**: Fetches review data (title, body, and star rating) from local storage for autofill purposes.
- **Form Autofill**: Automatically populates the review form with the title and body. If the title includes a leading rating (ex: "5;Great Product"), it attempts to set the corresponding star rating (by clicking). **If the leading rating is not there, it will continue by just "entering" the “Review Title” and “Review Body.”**
- **Manual Data Entry**: Allows for manual entry of review details in a specific format ("Title;Body" or "Rating;Title;Body") for those preferring or needing to input data directly.
- **Randomized Click Intervals**: Includes a feature to click star ratings at random intervals between 500ms and 1000ms, aiming to mimic human behavior and reduce detection risk by automated systems.

## Demo of Amazon Review Autofill
![demo_of_amazon_review_autofill](https://github.com/heminp16/Vine-Customization/assets/88010681/3c6ded91-5abe-4f6b-884f-3d1327ff83b2)
 

# Installation Guide
### Step 1: Install a Userscript Manager

To use the scripts, you first need to install a userscript manager extension in your browser. Tampermonkey is the most popular option and is available for multiple browsers. Choose your browser from the list below and install Tampermonkey from the respective extension store:

- **Google Chrome**: [Tampermonkey on Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Mozilla Firefox**: [Tampermonkey on Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- **Microsoft Edge**: [Tampermonkey on Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Safari**: Search for "Tampermonkey" in the Safari Extensions store.

### Step 2: Install the Scripts

After installing Tampermonkey or a similar userscript manager, you can install the scripts designed to enhance the Amazon Vine review process. You can choose to install both scripts or just one, depending on your needs.

- **Extract Review Details Script**: Automates the extraction of review details for easier management.
  - [Install Extract Review Details Script](https://github.com/heminp16/Vine-Customization/raw/main/extract-review-details.user.js)

- **Autofill Script**: Simplifies the review-writing process by autofilling review forms on Amazon.
  - [Install Autofill Script](https://github.com/heminp16/Vine-Customization/raw/main/review-autofill.user.js)

Click on the links above to install the scripts. Tampermonkey will open a new tab showing the script's content and an "Install" button. Click "Install" to add the script to your browser.

### Step 3: Using the Scripts

Once installed, the scripts will automatically run on the appropriate Amazon pages. Ensure Tampermonkey is enabled in your browser, and you should see the scripts' effects next time you visit Amazon's Vine review pages.

# Feedback
Your feedback is invaluable, and I'm continually seeking ways to enhance the scripts to more effectively benefit the community. 

If you have suggestions, encounter any bugs, or wish to have your Amazon top-level domains (.ca, .co.uk, etc) added to the script, please let me know!

### Submitting Feedback

- **To report bugs or issues**: Please use the [GitHub Issues](https://github.com/heminp16/Vine-Customization/issues) page for the script. This allows me to track and address problems efficiently. Moreover, if you do not have a GitHub account, you can use the [Feedback Form](https://forms.gle/7J7nEvBZXyYwCa5C8) link.
- **To suggest enhancements or request domain additions**: Fill out this [Feedback Form](https://forms.gle/7J7nEvBZXyYwCa5C8). I'm particularly interested in hearing about how I can make the scripts more useful, including adding support for additional domains.
