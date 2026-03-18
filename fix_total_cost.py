import re

with open('app.js', 'r') as f:
    content = f.read()

# Fix grandTotal in updateDashboard when filters are empty
old_grand_total_1 = """                if (startDateFilter && endDateFilter) {
                    const start = new Date(startDateFilter);
                    const end = new Date(endDateFilter);
                    withinDateRange = billDate >= start && billDate <= end;
                } else {
                    withinDateRange = billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
                }"""

new_grand_total_1 = """                if (startDateFilter && endDateFilter) {
                    const start = new Date(startDateFilter);
                    const end = new Date(endDateFilter);
                    withinDateRange = billDate >= start && billDate <= end;
                } else {
                    withinDateRange = true;
                }"""

content = content.replace(old_grand_total_1, new_grand_total_1)

old_grand_total_2 = """        if (startDateFilter && endDateFilter) {
            const start = new Date(startDateFilter);
            const end = new Date(endDateFilter);
            withinDateRange = readingDate >= start && readingDate <= end;
        } else {
            withinDateRange = readingDate.getMonth() === currentMonth && readingDate.getFullYear() === currentYear;
        }"""

new_grand_total_2 = """        if (startDateFilter && endDateFilter) {
            const start = new Date(startDateFilter);
            const end = new Date(endDateFilter);
            withinDateRange = readingDate >= start && readingDate <= end;
        } else {
            withinDateRange = true;
        }"""

content = content.replace(old_grand_total_2, new_grand_total_2)

with open('app.js', 'w') as f:
    f.write(content)
