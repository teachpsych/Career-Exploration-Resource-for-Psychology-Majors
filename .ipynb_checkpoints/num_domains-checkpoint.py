from collections import defaultdict
from docx import Document
import re

def extract_domains(text):
    # Regular expression to match URLs with http or https
    url_pattern = re.compile(r'https?://(?:www\.)?([^/]+)')
    domains = re.findall(url_pattern, text)
    return domains

def count_domains(docx_file):
    doc = Document(docx_file)
    domain_count = defaultdict(int)
    
    for paragraph in doc.paragraphs:
        text = paragraph.text
        domains = extract_domains(text)
        for domain in domains:
            domain_count[domain] += 1
            
    return domain_count

def save_sorted_results(domain_count, output_file):
    sorted_by_count = sorted(domain_count.items(), key=lambda item: item[1], reverse=True)
    sorted_alphabetically = sorted(domain_count.items())

    with open(output_file, 'w') as f:
        f.write("Sorted by Frequency:\n")
        for domain, count in sorted_by_count:
            f.write(f"{domain}: {count}\n")

        f.write("\nSorted Alphabetically:\n")
        for domain, count in sorted_alphabetically:
            f.write(f"{domain}: {count}\n")
            
    print("Results saved to", output_file)

def main(docx_file, output_file):
    domain_count = count_domains(docx_file)
    save_sorted_results(domain_count, output_file)

# Replace 'input.docx' with the path to your DOCX file and 'output.txt' with your desired output file path
docx_file = 'careers.docx'
output_file = 'output.txt'
main(docx_file, output_file)
