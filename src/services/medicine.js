import puppeteer from 'puppeteer';

export async function getMedicineDetails(medicineName) {
  try {
    const encodedName = encodeURIComponent(medicineName);
    const searchUrl = `https://www.1mg.com/search/all?name=${encodedName}`;

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('a[href*="/drugs/"]');
    // Get product link and navigate to details page
    const productLink = await page.evaluate(() => {
      const firstResult = document.querySelector('a[href*="/drugs/"]');
      return firstResult ? firstResult.getAttribute('href') : null;
    });

    if (!productLink) {
      await browser.close();
      throw new Error('No medicine found.');
    }

    const medicineUrl = `https://www.1mg.com${productLink}`;
    await page.goto(medicineUrl, { waitUntil: 'networkidle2' });

    // Extract all information at once
    const medicineInfo = await page.evaluate(() => {
      // Get basic info
      const title = document.querySelector('h1')?.innerText.trim() || 'N/A';

      // Get meta information
      const metaInfo = {};
      document.querySelectorAll('.DrugHeader__meta___B3BcU').forEach(item => {
        const key = item.querySelector('.DrugHeader__meta-title___22zXC')?.innerText.trim();
        const value = item.querySelector('.DrugHeader__meta-value___vqYM0')?.innerText.trim();
        if (key && value) metaInfo[key] = value;
      });

      // Get all sections content
      const sections = {};
      document.querySelectorAll('.DrugOverview__container___CqA8x').forEach(section => {
        const sectionTitle = section.querySelector('.DrugOverview__title___1OwgG')?.innerText.trim();
        const content = section.querySelector('.DrugOverview__content___22ZBX');

        if (sectionTitle && content) {
          if (sectionTitle.includes('Uses')) {
            // Handle Uses section
            const uses = Array.from(content.querySelectorAll('.DrugOverview__list___1HjxR li'))
              .map(li => `- ${li.textContent.trim()}`);
            sections[sectionTitle] = uses.join('\n');
          }
          else if (sectionTitle.includes('Benefits')) {
            // Handle Benefits section
            const benefits = Array.from(content.querySelectorAll('.ShowMoreArray__tile___2mFZk'))
              .map(tile => {
                const heading = tile.querySelector('h3')?.textContent.trim();
                const description = tile.querySelector('div > div')?.textContent.trim();
                return `**${heading}**\n${description}`;
              });
            sections[sectionTitle] = benefits.join('\n\n');
          }
          else {
            // Handle other sections
            sections[sectionTitle] = content.textContent.trim();
          }
        }
      });

      // Add substitute medicines section
      const substitutes = [];
      document.querySelectorAll('.SubstituteItem__item___1wbMv').forEach(item => {
        const name = item.querySelector('.SubstituteItem__name___PH8Al')?.innerText.trim();
        const manufacturer = item.querySelector('.SubstituteItem__manufacturer-name___2X-vB')?.innerText.trim();
        const price = item.querySelector('.SubstituteItem__unit-price___MIbLo')?.innerText.trim();
        const savings = item.querySelector('.SubstituteItem__save-text___1DPP8')?.innerText.trim();

        if (name && manufacturer) {
          substitutes.push({
            name,
            manufacturer,
            price: price || 'N/A',
            savings: savings || 'N/A'
          });
        }
      });

      return {
        title,
        metaInfo,
        sections,
        substitutes: substitutes.slice(0, 5) // Get first 5 substitutes
      };
    });

    await browser.close();

    // Format the output
    let output = `Title: ${medicineInfo.title}\n\n`;

    Object.entries(medicineInfo.metaInfo).forEach(([key, value]) => {
      output += `${key}: ${value}\n`;
    });
    output += '\n';

    Object.entries(medicineInfo.sections).forEach(([title, content]) => {
      output += `${title}:\n${content}\n\n`;
    });

    // Add substitute medicines section
    if (medicineInfo.substitutes && medicineInfo.substitutes.length > 0) {
      output += 'Substitute Medicines:\n';
      medicineInfo.substitutes.forEach((substitute, index) => {
        output += `${index + 1}. ${substitute.name}\n`;
        output += `   Manufacturer: ${substitute.manufacturer}\n`;
        output += `   Price: ${substitute.price}\n`;
        output += `   Savings: ${substitute.savings}\n`;
        output += '\n';
      });
    }

    return output;

  } catch (error) {
    console.error('Error fetching medicine details:', error);
    throw new Error('Failed to fetch medicine details.');
  }
}
