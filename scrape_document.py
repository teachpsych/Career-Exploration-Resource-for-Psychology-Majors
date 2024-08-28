file_path = 'careers.docx'
output_docx_path = 'modified_document_redirects_detailed.docx'
log_path = 'non_working_links_logged.csv'

import requests
import re
from urllib.parse import urlparse
from datetime import datetime
from docx import Document
import csv
from collections import defaultdict

# List of websites that should always be considered as working
always_good_websites = ['www.psichi.org', 'www.bls.gov','hiring.monster.com','www.prospects.ac.uk',
                        'www.mayo.edu','www.counselling-directory.org.uk','nationalcareersservice.direct.gov.uk']

# Read the docx file
def read_docx(file_path):
    doc = Document(file_path)
    links = []
    for paragraph in doc.paragraphs:
        # Regex to find URLs
        urls = re.findall(r'http[s]?://[^\s]+', paragraph.text)
        links.append((paragraph, urls))
    return links, doc

# Extract unique website names
def extract_unique_domains(links):
    domains = set()
    for _, link_list in links:
        for link in link_list:
            parsed_url = urlparse(link)
            domain = '.'.join(parsed_url.netloc.split('.')[-2:])
            domains.add(domain)
    return domains

# Test if a link is working using a HEAD request for speed
def check_link(link):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
        }

        session = requests.Session()

        # Check if the link domain should always be considered as working
        parsed_url = urlparse(link)
        if parsed_url.netloc in always_good_websites:
            print(f"Link: {link} - Forced to be considered as working")
            return True, 200, None, None, None

        # Check HTTP version with headers
        response = session.head(link, allow_redirects=True, timeout=5, headers=headers)
        if response.status_code == 200:
            print(f"Link: {link} - HTTP Status: {response.status_code} OK")
            return True, response.status_code, response.headers.get('Last-Modified'), response.headers.get('Location'), None
        elif response.status_code == 301 or response.status_code == 302:
            redirected_url = response.headers.get('Location')
            print(f"Link: {link} - Redirected to: {redirected_url}")
            return True, response.status_code, response.headers.get('Last-Modified'), redirected_url, None
        else:
            print(f"Link: {link} - HTTP Status: {response.status_code}")

            # Check HTTPS version with headers
            https_link = link.replace('http://', 'https://')
            response = session.head(https_link, allow_redirects=True, timeout=5, headers=headers)
            if response.status_code == 200:
                print(f"Link: {https_link} - HTTPS Status: {response.status_code} OK")
                return True, response.status_code, response.headers.get('Last-Modified'), response.headers.get('Location'), None
            elif response.status_code == 301 or response.status_code == 302:
                redirected_url = response.headers.get('Location')
                print(f"Link: {https_link} - Redirected to: {redirected_url}")
                return True, response.status_code, response.headers.get('Last-Modified'), redirected_url, None
            else:
                print(parsed_url.netloc)
                print(f"Link: {https_link} - HTTPS Status: {response.status_code}")
                return False, response.status_code, None, None, f"HTTPS Error {response.status_code}"

    except requests.RequestException as e:
        print(parsed_url.netloc)
        print(link)
        print(f"Link: {link} - Error: {e}")
        return False, None, None, None, str(e)

# Remove non-working links from the document
def remove_links_from_paragraph(paragraph, non_working_links):
    for run in paragraph.runs:
        for link in non_working_links:
            if link in run.text:
                run.text = run.text.replace(link, '')

# Log non-working links and redirects in CSV format
def log_errors_to_csv(log_path, link, error_code, netloc, redirected_url=None):
    with open(log_path, 'a', newline='') as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow([link, netloc, error_code, redirected_url])

# Update redirected links in the document
def update_redirected_links(paragraph, link, redirected_url):
    for run in paragraph.runs:
        if link in run.text:
            run.text = run.text.replace(link, f"{link} (Redirected to: {redirected_url})")

# Main function
def process_links(file_path, output_docx_path, log_path):
    links, doc = read_docx(file_path)
    total_links = sum(len(link_list) for _, link_list in links)
    processed_links = 0
    good_links_count = 0
    bad_links_count = 0
    response_codes = defaultdict(int)
    last_modified_dates = []

    domains = extract_unique_domains(links)
    sorted_domains = sorted(domains)  # Sort domains alphabetically
    print("Unique Domains:")
    for domain in sorted_domains:
        print(domain)

    with open(log_path, 'w', newline='') as log_file:
        csv_writer = csv.writer(log_file)
        csv_writer.writerow(['Website', 'Domain', 'Error Code', 'Redirected URL'])

        for idx, (paragraph, link_list) in enumerate(links, 1):
            non_working_links = []
            for link in link_list:
                processed_links += 1
                is_working, status_code, last_modified, redirected_url, error = check_link(link)

                parsed_url = urlparse(link)
                
                # Handle cases where not all five values are returned
                if is_working:
                    good_links_count += 1
                    if redirected_url:
                        update_redirected_links(paragraph, link, redirected_url)
                        log_errors_to_csv(log_path, link, status_code, parsed_url.netloc, redirected_url)
                else:
                    bad_links_count += 1
                    non_working_links.append(link)
                    log_errors_to_csv(log_path, link+' ', status_code, parsed_url.netloc)

                # Collect response codes
                if status_code:
                    response_codes[status_code] += 1

                # Collect last modified dates
                if last_modified:
                    try:
                        last_modified_date = datetime.strptime(last_modified, '%a, %d %b %Y %H:%M:%S %Z')
                        last_modified_dates.append(last_modified_date)
                    except ValueError:
                        pass  # Handle if last modified date format is unexpected

                print(f"Processed {processed_links}/{total_links} links", end='\r')

            remove_links_from_paragraph(paragraph, non_working_links)
            doc.save(output_docx_path)  # Save the document in real time

    print("\nProcessing complete!")

    # Print statistics
    print(f"Total Links: {total_links}")
    print(f"Good Links: {good_links_count}")
    print(f"Bad Links: {bad_links_count}")
    print("Response Codes:")
    for code, count in response_codes.items():
        print(f"- {code}: {count}")

    if last_modified_dates:
        avg_age = calculate_average_age(last_modified_dates)
        print(f"Average Age of Links: {avg_age}")

def calculate_average_age(dates):
    if not dates:
        return None
    total_seconds = sum((datetime.now() - date).total_seconds() for date in dates)
    return total_seconds / len(dates)

# # Example usage
# file_path = 'path_to_your_document.docx'
# output_docx_path = 'modified_document.docx'
# log_path = 'non_working_links.csv'
process_links(file_path, output_docx_path, log_path)
